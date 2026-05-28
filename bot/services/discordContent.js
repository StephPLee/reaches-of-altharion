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

function buildDiscordContent(heading, body) {
  const title = heading ? `## ${heading}` : "";
  const divider = "\n\n---";
  const full = title ? `${title}\n\n${body}${divider}` : `${body}${divider}`;

  if (full.length <= DISCORD_MSG_LIMIT) {
    return full;
  }

  const overhead = (title ? title.length + 2 : 0) + divider.length;
  const maxBody = DISCORD_MSG_LIMIT - overhead - 3;
  const truncated = `${body.slice(0, maxBody)}...`;
  return title ? `${title}\n\n${truncated}${divider}` : `${truncated}${divider}`;
}

async function postAllStartingGracesToDiscord(client, channelId) {
  const result = await pool.query(
    `SELECT id, title, content_markdown, discord_message_id
     FROM starting_graces
     WHERE is_published = true
     ORDER BY LOWER(title) ASC, id ASC`,
  );

  const channel = await client.channels.fetch(channelId);
  let posted = 0;

  for (const row of result.rows) {
    const content = buildDiscordContent(row.title, row.content_markdown.trim());

    if (row.discord_message_id) {
      try {
        const msg = await channel.messages.fetch(row.discord_message_id);
        await msg.edit(content);
        posted++;
        continue;
      } catch {
        // Message gone — fall through to post new
      }
    }

    const msg = await channel.send(content);
    await pool.query(
      "UPDATE starting_graces SET discord_message_id = $1 WHERE id = $2",
      [msg.id, row.id],
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
    `SELECT section_index, section_heading, discord_message_id
     FROM discord_wiki_sections
     WHERE wiki_slug = $1
     ORDER BY section_index`,
    [slug],
  );
  const existingSections = dbResult.rows;
  const channel = await client.channels.fetch(channelId);

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const content = buildDiscordContent(
      section.heading,
      section.content.trim(),
    );
    const existing = existingSections.find((s) => s.section_index === i);

    let messageId;

    if (existing?.discord_message_id) {
      try {
        const msg = await channel.messages.fetch(existing.discord_message_id);
        await msg.edit(content);
        messageId = existing.discord_message_id;
      } catch {
        const msg = await channel.send(content);
        messageId = msg.id;
      }
    } else {
      const msg = await channel.send(content);
      messageId = msg.id;
    }

    await pool.query(
      `INSERT INTO discord_wiki_sections (wiki_slug, section_index, section_heading, discord_message_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (wiki_slug, section_index)
       DO UPDATE SET section_heading = $3, discord_message_id = $4`,
      [slug, i, section.heading, messageId],
    );
  }

  for (const existing of existingSections) {
    if (existing.section_index >= sections.length) {
      if (existing.discord_message_id) {
        try {
          const msg = await channel.messages.fetch(existing.discord_message_id);
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
