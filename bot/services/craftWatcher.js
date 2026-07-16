const pool = require("../db");
const config = require("../config");
const {
  formatCharacterName,
  grantWestMarchesItem,
  isWestMarchesConfigured,
  listAllWestMarchesCharacters,
  normalizeCharacterNameSearch,
} = require("./westMarches");

const CRAFT_TITLE_PATTERN = /^(.+?) is currently crafting a (.+)!$/i;
const CRAFT_COMPLETE_FIELD_NAME_PATTERN = /^craft complete!?$/i;
const CRAFT_COMPLETE_VALUE_PATTERN = /^your (.+?) has been completed/i;
const CONSUMABLE_KEYWORDS_PATTERN =
  /\b(potion|scroll|elixir|philter|oil|poison|bomb|draught|tonic)\b/i;

function guessIsConsumable(itemName) {
  return CONSUMABLE_KEYWORDS_PATTERN.test(itemName);
}

function parseCraftCompleteEmbed(message) {
  if (!message.guildId) return null;
  if (!config.craftingWorkshopsForumChannelId) return null;
  if (
    !message.channel?.isThread?.() ||
    message.channel.parentId !== config.craftingWorkshopsForumChannelId
  ) {
    return null;
  }
  if (!message.author?.bot) return null;

  const embed = message.embeds?.[0];
  if (!embed) return null;

  const firstDescriptionLine = (embed.description || "").split("\n")[0]?.trim() || "";
  const titleSource = embed.title?.trim() || firstDescriptionLine;
  const titleMatch = titleSource.match(CRAFT_TITLE_PATTERN);
  if (!titleMatch) return null;

  const completeField = (embed.fields || []).find((field) =>
    CRAFT_COMPLETE_FIELD_NAME_PATTERN.test(field.name || ""),
  );
  if (!completeField) return null;

  const valueMatch = completeField.value?.match(CRAFT_COMPLETE_VALUE_PATTERN);
  const itemName = (valueMatch?.[1] || titleMatch[2]).trim();
  const characterName = titleMatch[1].trim();

  if (!characterName || !itemName) return null;

  return { characterName, itemName };
}

async function insertPendingCraftWatchEvent(message, parsed) {
  const result = await pool.query(
    `
    INSERT INTO craft_watch_events (
      discord_message_id, discord_thread_id, discord_guild_id,
      raw_character_name, raw_item_name, match_status
    ) VALUES ($1, $2, $3, $4, $5, 'error')
    ON CONFLICT (discord_message_id) DO NOTHING
    RETURNING id
    `,
    [message.id, message.channelId, message.guildId, parsed.characterName, parsed.itemName],
  );
  return result.rows[0]?.id ?? null;
}

async function updateCraftWatchEvent(id, fields) {
  await pool.query(
    `
    UPDATE craft_watch_events
    SET
      match_status = $2,
      matched_character_id = $3,
      matched_character_name = $4,
      matched_discord_user_id = $5,
      reward_result = $6,
      error_message = $7
    WHERE id = $1
    `,
    [
      id,
      fields.matchStatus,
      fields.matchedCharacterId ?? null,
      fields.matchedCharacterName ?? null,
      fields.matchedDiscordUserId ?? null,
      fields.rewardResult ? JSON.stringify(fields.rewardResult) : null,
      fields.errorMessage ?? null,
    ],
  );
}

function buildUnmatchedWarning({ characterName, itemName }) {
  return `I couldn't find a WestMarches.games character named **${characterName}** to grant **${itemName}** to. A staff member will need to add it manually.`;
}

function buildAmbiguousWarning({ characterName, itemName }, matches) {
  const names = matches.map(formatCharacterName).join(", ");
  return `I found multiple WestMarches.games characters named **${characterName}** (${names}) — I could not automatically grant **${itemName}**. A staff member will need to add it manually.`;
}

async function handleMessageForCraftWatcher(client, message) {
  const parsed = parseCraftCompleteEmbed(message);
  if (!parsed) return;

  const auditId = await insertPendingCraftWatchEvent(message, parsed);
  if (!auditId) return; // already processed

  try {
    if (!isWestMarchesConfigured()) {
      await updateCraftWatchEvent(auditId, {
        matchStatus: "error",
        errorMessage: "west_marches_not_configured",
      });
      return;
    }

    const characters = await listAllWestMarchesCharacters();
    const normalizedTarget = normalizeCharacterNameSearch(parsed.characterName);
    const matches = characters.filter(
      (character) =>
        normalizeCharacterNameSearch(formatCharacterName(character)) === normalizedTarget,
    );

    if (matches.length === 0) {
      await updateCraftWatchEvent(auditId, { matchStatus: "unmatched" });
      await message.reply({
        content: buildUnmatchedWarning(parsed),
        allowedMentions: { parse: [] },
      });
      return;
    }

    if (matches.length > 1) {
      await updateCraftWatchEvent(auditId, { matchStatus: "ambiguous" });
      await message.reply({
        content: buildAmbiguousWarning(parsed, matches),
        allowedMentions: { parse: [] },
      });
      return;
    }

    const character = matches[0];
    const isConsumable = guessIsConsumable(parsed.itemName);

    const rewardResult = await grantWestMarchesItem({
      characterId: character.id,
      itemName: parsed.itemName,
      quantity: 1,
      isConsumable,
      reason: `Crafting: ${parsed.itemName}`.slice(0, 500),
      discordUserId: character?.user?.discordId,
    });

    await updateCraftWatchEvent(auditId, {
      matchStatus: "matched",
      matchedCharacterId: character.id,
      matchedCharacterName: formatCharacterName(character),
      matchedDiscordUserId: character?.user?.discordId || null,
      rewardResult,
    });

    await message.reply({
      content: `Added **${parsed.itemName}** to **${formatCharacterName(character)}**'s inventory. Use \`/sell\` to list it on the player marketplace.`,
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    console.error("Failed to process craft-complete embed:", error);
    await updateCraftWatchEvent(auditId, {
      matchStatus: "error",
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    }).catch(() => {});
    await message
      .reply({
        content:
          "I detected a completed craft but something went wrong granting the item automatically. A staff member may need to add it manually.",
        allowedMentions: { parse: [] },
      })
      .catch(() => {});
  }
}

module.exports = {
  CRAFT_TITLE_PATTERN,
  CRAFT_COMPLETE_FIELD_NAME_PATTERN,
  CRAFT_COMPLETE_VALUE_PATTERN,
  parseCraftCompleteEmbed,
  handleMessageForCraftWatcher,
};
