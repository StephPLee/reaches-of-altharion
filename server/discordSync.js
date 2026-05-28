const { pool } = require("./db");
const {
  deleteChannelMessage,
  editChannelMessage,
  postChannelMessage,
} = require("./discord");

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

async function syncStartingGraceToDiscord(grace, channelId) {
  if (!channelId) {
    return;
  }

  const content = buildDiscordContent(grace.title, grace.contentMarkdown.trim());
  const payload = { content, allowed_mentions: { parse: [] } };

  const dbResult = await pool.query(
    "SELECT discord_message_id FROM starting_graces WHERE id = $1",
    [grace.id],
  );
  const currentMessageId = dbResult.rows[0]?.discord_message_id;

  if (currentMessageId) {
    try {
      await editChannelMessage(channelId, currentMessageId, payload);
      return;
    } catch (editErr) {
      if (
        !editErr.message.includes("10008") &&
        !editErr.message.includes("404")
      ) {
        throw editErr;
      }
    }
  }

  const message = await postChannelMessage(channelId, payload);
  await pool.query(
    "UPDATE starting_graces SET discord_message_id = $1 WHERE id = $2",
    [message.id, grace.id],
  );
}

async function syncWikiPageToDiscord(page, channelId) {
  if (!channelId) {
    return;
  }

  const sections = parseMarkdownH2Sections(page.markdown);

  const dbResult = await pool.query(
    `SELECT section_index, section_heading, discord_message_id
     FROM discord_wiki_sections
     WHERE wiki_slug = $1
     ORDER BY section_index`,
    [page.slug],
  );
  const existingSections = dbResult.rows;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const content = buildDiscordContent(
      section.heading,
      section.content.trim(),
    );
    const payload = { content, allowed_mentions: { parse: [] } };
    const existing = existingSections.find((s) => s.section_index === i);

    let messageId;

    if (existing?.discord_message_id) {
      try {
        await editChannelMessage(channelId, existing.discord_message_id, payload);
        messageId = existing.discord_message_id;
      } catch (editErr) {
        if (
          !editErr.message.includes("10008") &&
          !editErr.message.includes("404")
        ) {
          throw editErr;
        }
        const msg = await postChannelMessage(channelId, payload);
        messageId = msg.id;
      }
    } else {
      const msg = await postChannelMessage(channelId, payload);
      messageId = msg.id;
    }

    await pool.query(
      `INSERT INTO discord_wiki_sections (wiki_slug, section_index, section_heading, discord_message_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (wiki_slug, section_index)
       DO UPDATE SET section_heading = $3, discord_message_id = $4`,
      [page.slug, i, section.heading, messageId],
    );
  }

  for (const existing of existingSections) {
    if (existing.section_index >= sections.length) {
      if (existing.discord_message_id) {
        await deleteChannelMessage(channelId, existing.discord_message_id).catch(() => {});
      }
      await pool.query(
        "DELETE FROM discord_wiki_sections WHERE wiki_slug = $1 AND section_index = $2",
        [page.slug, existing.section_index],
      );
    }
  }
}

module.exports = {
  parseMarkdownH2Sections,
  syncStartingGraceToDiscord,
  syncWikiPageToDiscord,
};
