const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const pool = require("../db");

const EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

// Mirrors the ranges in bot/interactions.js getBossDamageQuestMultiplier.
// If those ranges ever change, update both places.
const QUEST_LEVEL_BRACKETS = [
  { key: "4-8", label: "Levels 4-8" },
  { key: "9-13", label: "Levels 9-13" },
  { key: "14-17", label: "Levels 14-17" },
  { key: "18-20", label: "Levels 18-20" },
];

function mapQuestCallRow(row) {
  return row
    ? {
        id: row.id,
        channelId: row.discord_channel_id,
        messageId: row.discord_message_id,
        dmDiscordUserId: row.dm_discord_user_id,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        closedAt: row.closed_at,
        closeReason: row.close_reason,
      }
    : null;
}

function buildQuestCallComponents(questCallId) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`quest-call-pick:${questCallId}`)
    .setPlaceholder("Which level bracket(s) can you play?")
    .setMinValues(0)
    .setMaxValues(QUEST_LEVEL_BRACKETS.length)
    .addOptions(
      QUEST_LEVEL_BRACKETS.map((bracket) => ({
        label: bracket.label,
        value: bracket.key,
      })),
    );

  const closeButton = new ButtonBuilder()
    .setCustomId(`quest-call-close:${questCallId}`)
    .setLabel("Close call")
    .setStyle(ButtonStyle.Danger);

  return [
    new ActionRowBuilder().addComponents(selectMenu),
    new ActionRowBuilder().addComponents(closeButton),
  ];
}

function buildQuestCallEmbed(call, rows) {
  const isClosed = Boolean(call.closedAt);
  const expiresUnix = Math.floor(new Date(call.expiresAt).getTime() / 1000);

  const statusLine = isClosed
    ? call.closeReason === "manual"
      ? "**This call has been closed by the DM.**"
      : "**This call has expired.**"
    : `Expires <t:${expiresUnix}:R>.`;

  const embed = new EmbedBuilder()
    .setTitle("Quest Call")
    .setDescription(
      `<@${call.dmDiscordUserId}> is available to run a quest right now! Pick the level bracket(s) you have a character ready for below.\n\n${statusLine}`,
    )
    .setColor(isClosed ? 0x99aab5 : 0x57f287);

  for (const bracket of QUEST_LEVEL_BRACKETS) {
    const responders = rows.filter((row) => row.brackets.includes(bracket.key));
    const value = responders.length
      ? responders.map((row) => `<@${row.discordUserId}>`).join("\n")
      : "_no one yet_";
    embed.addFields({ name: bracket.label, value });
  }

  embed.setFooter({ text: "Only the DM who posted this call can close it early." });

  return embed;
}

async function createQuestCall(channelId, dmDiscordUserId) {
  const expiresAt = new Date(Date.now() + EXPIRY_MS);
  const result = await pool.query(
    `
    INSERT INTO quest_calls (discord_channel_id, dm_discord_user_id, expires_at)
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [channelId, dmDiscordUserId, expiresAt],
  );
  return mapQuestCallRow(result.rows[0]);
}

async function setQuestCallMessageId(questCallId, messageId) {
  await pool.query("UPDATE quest_calls SET discord_message_id = $2 WHERE id = $1", [
    questCallId,
    messageId,
  ]);
}

async function getQuestCall(questCallId) {
  const result = await pool.query("SELECT * FROM quest_calls WHERE id = $1", [questCallId]);
  return mapQuestCallRow(result.rows[0]);
}

async function setResponse(questCallId, discordUserId, brackets) {
  if (!brackets.length) {
    await pool.query(
      "DELETE FROM quest_call_responses WHERE quest_call_id = $1 AND discord_user_id = $2",
      [questCallId, discordUserId],
    );
    return;
  }

  await pool.query(
    `
    INSERT INTO quest_call_responses (quest_call_id, discord_user_id, brackets, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (quest_call_id, discord_user_id) DO UPDATE
    SET brackets = EXCLUDED.brackets, updated_at = NOW()
    `,
    [questCallId, discordUserId, brackets],
  );
}

async function listCallResponses(questCallId) {
  const result = await pool.query(
    "SELECT * FROM quest_call_responses WHERE quest_call_id = $1 ORDER BY updated_at ASC",
    [questCallId],
  );
  return result.rows.map((row) => ({
    discordUserId: row.discord_user_id,
    brackets: row.brackets,
    updatedAt: row.updated_at,
  }));
}

async function closeQuestCall(questCallId, reason) {
  const result = await pool.query(
    `
    UPDATE quest_calls SET closed_at = NOW(), close_reason = $2
    WHERE id = $1 AND closed_at IS NULL
    RETURNING *
    `,
    [questCallId, reason],
  );
  return mapQuestCallRow(result.rows[0]);
}

async function listOpenExpiredCalls() {
  const result = await pool.query(
    "SELECT * FROM quest_calls WHERE closed_at IS NULL AND expires_at <= NOW()",
  );
  return result.rows.map(mapQuestCallRow);
}

function startQuestCallExpiryLoop(client) {
  setInterval(async () => {
    let expiredCalls;
    try {
      expiredCalls = await listOpenExpiredCalls();
    } catch (error) {
      console.error("Failed to list expired quest calls:", error);
      return;
    }

    for (const call of expiredCalls) {
      try {
        const closed = await closeQuestCall(call.id, "expired");
        if (!closed) continue; // already closed by a race with a manual close

        const rows = await listCallResponses(call.id);
        const embed = buildQuestCallEmbed(closed, rows);
        const channel = await client.channels.fetch(closed.channelId);
        if (!channel?.messages || !closed.messageId) continue;

        const message = await channel.messages.fetch(closed.messageId);
        await message.edit({ embeds: [embed], components: [] });
      } catch (error) {
        console.error("Failed to auto-expire quest call:", { questCallId: call.id, error });
      }
    }
  }, REFRESH_INTERVAL_MS);
}

module.exports = {
  QUEST_LEVEL_BRACKETS,
  buildQuestCallComponents,
  buildQuestCallEmbed,
  closeQuestCall,
  createQuestCall,
  getQuestCall,
  listCallResponses,
  setQuestCallMessageId,
  setResponse,
  startQuestCallExpiryLoop,
};
