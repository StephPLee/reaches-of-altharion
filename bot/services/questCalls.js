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

function mapResponseRow(row) {
  return {
    discordUserId: row.discord_user_id,
    characterId: row.character_id,
    characterName: row.character_name,
    characterLevel: row.character_level,
    updatedAt: row.updated_at,
  };
}

function buildQuestCallMessageComponents(questCallId) {
  const respondButton = new ButtonBuilder()
    .setCustomId(`quest-call-respond:${questCallId}`)
    .setLabel("Respond with a character")
    .setStyle(ButtonStyle.Primary);

  const closeButton = new ButtonBuilder()
    .setCustomId(`quest-call-close:${questCallId}`)
    .setLabel("Close call")
    .setStyle(ButtonStyle.Danger);

  return [new ActionRowBuilder().addComponents(respondButton, closeButton)];
}

function buildQuestCallCharacterRow(questCallId, characters, selectedCharacterIds = []) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`quest-call-character-pick:${questCallId}`)
    .setPlaceholder("Choose the character(s) you'd like to play...")
    .setMinValues(0)
    .setMaxValues(Math.min(characters.length, 25))
    .addOptions(
      characters.slice(0, 25).map((character) => ({
        label: character.name.slice(0, 100),
        description: `${character.className ? `${character.className} · ` : ""}Level ${character.level || "unknown"}`.slice(0, 100),
        value: character.id,
        default: selectedCharacterIds.includes(character.id),
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildQuestCallEmbed(call, responses) {
  const isClosed = Boolean(call.closedAt);
  const expiresUnix = Math.floor(new Date(call.expiresAt).getTime() / 1000);

  const statusLine = isClosed
    ? call.closeReason === "manual"
      ? "**This call has been closed by the DM.**"
      : "**This call has expired.**"
    : `Expires <t:${expiresUnix}:R>.`;

  // Group by level, then by player within that level, so a player offering
  // several characters at the same level counts once, not once per character.
  const byLevel = new Map();
  for (const response of responses) {
    const key = response.characterLevel > 0 ? response.characterLevel : "unknown";
    if (!byLevel.has(key)) byLevel.set(key, new Map());
    const playersAtLevel = byLevel.get(key);
    if (!playersAtLevel.has(response.discordUserId)) {
      playersAtLevel.set(response.discordUserId, []);
    }
    playersAtLevel.get(response.discordUserId).push(response.characterName);
  }

  const levelKeys = [...byLevel.keys()].sort((a, b) => {
    if (a === "unknown") return 1;
    if (b === "unknown") return -1;
    return a - b;
  });

  const interestLines = levelKeys.length
    ? levelKeys
        .map((level) => {
          const playersAtLevel = byLevel.get(level);
          const label = level === "unknown" ? "Unknown level" : `Level ${level}`;
          const names = [...playersAtLevel.entries()]
            .map(([discordUserId, characterNames]) => `<@${discordUserId}> (${characterNames.join(", ")})`)
            .join(", ");
          return `**${label}** (${playersAtLevel.size}) — ${names}`;
        })
        .join("\n")
    : "_No responses yet._";

  const embed = new EmbedBuilder()
    .setTitle("Quest Call")
    .setDescription(
      `<@${call.dmDiscordUserId}> is available to run a quest right now! Click **Respond with a character** below and pick which of your characters you'd like to bring.\n\n${statusLine}\n\n**Interest by level**\n${interestLines}`,
    )
    .setColor(isClosed ? 0x99aab5 : 0x57f287)
    .setFooter({ text: "Only the DM who posted this call can close it early." });

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

async function setCharacterResponses(questCallId, discordUserId, characters) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "DELETE FROM quest_call_responses WHERE quest_call_id = $1 AND discord_user_id = $2",
      [questCallId, discordUserId],
    );
    for (const character of characters) {
      await client.query(
        `
        INSERT INTO quest_call_responses
          (quest_call_id, discord_user_id, character_id, character_name, character_level, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        `,
        [questCallId, discordUserId, character.id, character.name, character.level],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function listCallResponses(questCallId) {
  const result = await pool.query(
    "SELECT * FROM quest_call_responses WHERE quest_call_id = $1 ORDER BY character_level ASC, updated_at ASC",
    [questCallId],
  );
  return result.rows.map(mapResponseRow);
}

async function listUserResponseCharacterIds(questCallId, discordUserId) {
  const result = await pool.query(
    "SELECT character_id FROM quest_call_responses WHERE quest_call_id = $1 AND discord_user_id = $2",
    [questCallId, discordUserId],
  );
  return result.rows.map((row) => row.character_id);
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

        const responses = await listCallResponses(call.id);
        const embed = buildQuestCallEmbed(closed, responses);
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
  buildQuestCallCharacterRow,
  buildQuestCallEmbed,
  buildQuestCallMessageComponents,
  closeQuestCall,
  createQuestCall,
  getQuestCall,
  listCallResponses,
  listUserResponseCharacterIds,
  setCharacterResponses,
  setQuestCallMessageId,
  startQuestCallExpiryLoop,
};
