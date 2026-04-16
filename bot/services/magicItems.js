const { ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder } = require("discord.js");
const pool = require("../db");

const MAGIC_ITEM_RARITIES = [
  {
    value: "common",
    label: "Common",
    description: "Roll a random common magic item.",
  },
  {
    value: "uncommon",
    label: "Uncommon",
    description: "Roll a random uncommon magic item.",
  },
  {
    value: "rare",
    label: "Rare",
    description: "Roll a random rare magic item.",
  },
  {
    value: "veryrare",
    label: "Very Rare",
    description: "Roll a random very rare magic item.",
  },
  {
    value: "legendary",
    label: "Legendary",
    description: "Roll a random legendary magic item.",
  },
];

const MAGIC_ITEM_RESULT_GIF_URL =
  "https://cdn.discordapp.com/attachments/1088129532214644776/1465689802887401607/rashaken-idleon.gif";


function buildMagicItemRarityRow(discordUserId, selectedRarity = null) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`magicitem:${discordUserId}`)
    .setPlaceholder("Select a rarity...")
    .addOptions(
      MAGIC_ITEM_RARITIES.map((rarity) => ({
        label: rarity.label,
        description: rarity.description,
        value: rarity.value,
        default: rarity.value === selectedRarity,
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}


async function getRandomMagicItem(rarity) {
  const result = await pool.query(
    `
    WITH ranked_items AS (
      SELECT
        id,
        name,
        ROW_NUMBER() OVER (ORDER BY sort_order ASC, id ASC) AS roll_number,
        COUNT(*) OVER () AS total_count
      FROM magic_items
      WHERE rarity = $1
        AND is_published = true
    )
    SELECT
      name AS item_label,
      roll_number,
      total_count
    FROM ranked_items
    ORDER BY RANDOM()
    LIMIT 1
    `,
    [rarity],
  );

  return result.rows[0] ?? null;
}


function getMagicItemRarityTheme(rarityValue) {
  switch (rarityValue) {
    case "common":
      return {
        color: 0x9e9e9e,
        title: "Vault Lot Drawn",
        flavor:
          "From the lower cedar racks, the quartermaster produces a serviceable charm fit for a prepared traveler.",
      };
    case "uncommon":
      return {
        color: 0x43a047,
        title: "Vault Lot Drawn",
        flavor:
          "A brighter glimmer answers the summons as the vault yields a prize of uncommon merit.",
      };
    case "rare":
      return {
        color: 0x1e88e5,
        title: "Vault Lot Drawn",
        flavor:
          "The warded cabinets part and a rarer treasure is brought forth with due ceremony.",
      };
    case "veryrare":
      return {
        color: 0x8e24aa,
        title: "Vault Lot Drawn",
        flavor:
          "The deeper sigils awaken. What emerges is no ordinary relic, but a piece of notable power.",
      };
    case "legendary":
      return {
        color: 0xffb300,
        title: "Vault Lot Drawn",
        flavor:
          "Ancient wards answer the call, and the vault releases a treasure spoken of more often than seen.",
      };
    default:
      return {
        color: 0x607d8b,
        title: "Vault Lot Drawn",
        flavor: "The vault stirs and yields its chosen prize.",
      };
  }
}


function buildMagicItemResultEmbed({
  displayName,
  userMention,
  userAvatarUrl,
  rarity,
  rollNumber,
  totalCount,
  itemName,
}) {
  const theme = getMagicItemRarityTheme(rarity.value);

  return new EmbedBuilder()
    .setColor(theme.color)
    .setAuthor({
      name: displayName,
      iconURL: userAvatarUrl,
    })
    .setTitle(theme.title)
    .setDescription(
      `${theme.flavor}\n\nMarked claimant: ${userMention}`,
    )
    .addFields(
      { name: "Rarity", value: rarity.label, inline: true },
      { name: "Roll", value: `${rollNumber} / ${totalCount}`, inline: true },
      { name: "Item", value: `**${itemName}**` },
    )
    .setThumbnail(MAGIC_ITEM_RESULT_GIF_URL)
    .setFooter({ text: "The vault stands ready for the next draw." })
    .setTimestamp();
}


module.exports = {
  MAGIC_ITEM_RARITIES,
  buildMagicItemRarityRow,
  buildMagicItemResultEmbed,
  getRandomMagicItem,
};
