const pool = require("../db");

const DISCORD_MSG_LIMIT = 2000;

function parseMarkdownH2Sections(markdown) {
  const lines = markdown.split("\n");
  const sections = [];
  let currentHeading = null;
  let currentLines = [];

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/);
    if (h2Match) {
      if (currentHeading !== null || currentLines.some((l) => l.trim())) {
        sections.push({
          heading: currentHeading,
          content: currentLines.join("\n").trim(),
        });
      }
      currentHeading = h2Match[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentHeading !== null || currentLines.some((l) => l.trim())) {
    sections.push({
      heading: currentHeading,
      content: currentLines.join("\n").trim(),
    });
  }

  return sections.filter((s) => s.heading || s.content);
}

// Greedily packs tokens back together with `separator` between them, keeping
// each chunk within `limit` characters. A token longer than `limit` on its
// own is hard-sliced so we never produce a chunk Discord would reject.
function packTokens(tokens, separator, limit) {
  const chunks = [];
  let current = "";

  for (const token of tokens) {
    const candidate = current ? `${current}${separator}${token}` : token;
    if (candidate.length <= limit) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (token.length <= limit) {
      current = token;
    } else {
      for (let i = 0; i < token.length; i += limit) {
        chunks.push(token.slice(i, i + limit));
      }
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

// Splits a heading + body into an ordered list of Discord message contents,
// each within DISCORD_MSG_LIMIT, instead of truncating overflow content.
function splitDiscordContent(heading, body) {
  const title = heading ? `## ${heading}` : "";
  const divider = "\n\n---";

  const rawParagraphs = body.split(/\n{2,}/).filter((paragraph) => paragraph.trim());
  const paragraphs = rawParagraphs.flatMap((paragraph) =>
    paragraph.length <= DISCORD_MSG_LIMIT
      ? [paragraph]
      : packTokens(paragraph.split(" "), " ", DISCORD_MSG_LIMIT),
  );

  const chunks = packTokens(paragraphs, "\n\n", DISCORD_MSG_LIMIT);
  if (chunks.length === 0) {
    chunks.push("");
  }

  if (title) {
    const merged = chunks[0] ? `${title}\n\n${chunks[0]}` : title;
    if (merged.length <= DISCORD_MSG_LIMIT) {
      chunks[0] = merged;
    } else {
      chunks.unshift(title);
    }
  }

  const lastIndex = chunks.length - 1;
  const mergedLast = `${chunks[lastIndex]}${divider}`;
  if (mergedLast.length <= DISCORD_MSG_LIMIT) {
    chunks[lastIndex] = mergedLast;
  } else {
    chunks.push(divider.replace(/^\n\n/, ""));
  }

  return chunks;
}

// Reconciles `parts` (in order) against previously-posted message ids: edits
// messages that still exist, posts new ones for any extra parts, and deletes
// leftover messages if the content shrank. Returns the new id list in order.
async function syncMessageParts(channel, existingMessageIds, parts) {
  const finalMessageIds = [];

  for (let i = 0; i < parts.length; i++) {
    const existingId = existingMessageIds[i];
    if (existingId) {
      try {
        const msg = await channel.messages.fetch(existingId);
        await msg.edit(parts[i]);
        finalMessageIds.push(existingId);
        continue;
      } catch {
        // Message gone — fall through to post new
      }
    }

    const msg = await channel.send(parts[i]);
    finalMessageIds.push(msg.id);
  }

  for (let i = parts.length; i < existingMessageIds.length; i++) {
    try {
      const msg = await channel.messages.fetch(existingMessageIds[i]);
      await msg.delete();
    } catch {
      // Already gone
    }
  }

  return finalMessageIds;
}

async function postAllStartingGracesToDiscord(client, channelId) {
  const result = await pool.query(
    `SELECT id, title, content_markdown, discord_message_ids
     FROM starting_graces
     WHERE is_published = true
     ORDER BY LOWER(title) ASC, id ASC`,
  );

  const channel = await client.channels.fetch(channelId);
  let posted = 0;

  for (const row of result.rows) {
    const parts = splitDiscordContent(row.title, row.content_markdown.trim());
    const finalMessageIds = await syncMessageParts(
      channel,
      row.discord_message_ids || [],
      parts,
    );

    await pool.query(
      "UPDATE starting_graces SET discord_message_ids = $1 WHERE id = $2",
      [finalMessageIds, row.id],
    );
    posted++;
  }

  return posted;
}

async function postWikiSectionsToDiscord(client, slug, channelId) {
  const pageResult = await pool.query(
    "SELECT slug, markdown FROM wiki_pages WHERE slug = $1",
    [slug],
  );
  const page = pageResult.rows[0];
  if (!page) {
    return 0;
  }

  const sections = parseMarkdownH2Sections(page.markdown);
  const dbResult = await pool.query(
    `SELECT section_index, section_heading, discord_message_ids
     FROM discord_wiki_sections
     WHERE wiki_slug = $1
     ORDER BY section_index`,
    [slug],
  );
  const existingSections = dbResult.rows;
  const channel = await client.channels.fetch(channelId);

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const parts = splitDiscordContent(section.heading, section.content.trim());
    const existing = existingSections.find((s) => s.section_index === i);
    const finalMessageIds = await syncMessageParts(
      channel,
      existing?.discord_message_ids || [],
      parts,
    );

    await pool.query(
      `INSERT INTO discord_wiki_sections (wiki_slug, section_index, section_heading, discord_message_ids)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (wiki_slug, section_index)
       DO UPDATE SET section_heading = $3, discord_message_ids = $4`,
      [slug, i, section.heading, finalMessageIds],
    );
  }

  for (const existing of existingSections) {
    if (existing.section_index >= sections.length) {
      for (const messageId of existing.discord_message_ids || []) {
        try {
          const msg = await channel.messages.fetch(messageId);
          await msg.delete();
        } catch {
          // Already deleted
        }
      }
      await pool.query(
        "DELETE FROM discord_wiki_sections WHERE wiki_slug = $1 AND section_index = $2",
        [slug, existing.section_index],
      );
    }
  }

  return sections.length;
}

module.exports = {
  postAllStartingGracesToDiscord,
  postWikiSectionsToDiscord,
};
