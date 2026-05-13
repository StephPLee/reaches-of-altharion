const { EmbedBuilder } = require("discord.js");
const config = require("../config");
const pool = require("../db");
const { truncateValue } = require("../utils");

function formatBossHp(value) {
  return BigInt(value).toLocaleString("en-US");
}


function normalizeBossImageUrl(imageUrl) {
  const trimmed = typeof imageUrl === "string" ? imageUrl.trim() : "";
  const defaultPath = "/img/events/direbunny.jpg";
  const value = trimmed || defaultPath;

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const pathPart = value.startsWith("/") ? value : `/${value}`;
  return `${config.publicSiteUrl}${pathPart}`;
}


function mapBossRow(row) {
  return row
    ? {
        id: Number(row.id),
        name: row.name,
        maxHp: BigInt(row.max_hp),
        currentHp: BigInt(row.current_hp),
        trackingMode: row.tracking_mode || "countdown",
        imageUrl: row.image_url,
        statusChannelId: row.status_channel_id,
        statusMessageId: row.status_message_id,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    : null;
}


function isBossCountUp(boss) {
  return boss.trackingMode === "countup" || boss.trackingMode === "countup_unbounded";
}


function isBossUnbounded(boss) {
  return boss.trackingMode === "countup_unbounded";
}


function buildBossHpBar(currentHp, maxHp, width = 20) {
  const safeMaxHp = maxHp > 0n ? maxHp : 1n;
  const clampedCurrentHp =
    currentHp < 0n ? 0n : currentHp > safeMaxHp ? safeMaxHp : currentHp;
  const filled = Number((clampedCurrentHp * BigInt(width)) / safeMaxHp);
  const empty = width - filled;

  return `[ ${"█".repeat(filled)}${"-".repeat(empty)} ] ${formatBossHp(clampedCurrentHp)}/${formatBossHp(safeMaxHp)}`;
}


function buildBossStatusEmbed(boss) {
  if (isBossUnbounded(boss)) {
    return new EmbedBuilder()
      .setTitle(boss.name)
      .setDescription(`Progress: ${formatBossHp(boss.currentHp)} / ∞`)
      .setImage(normalizeBossImageUrl(boss.imageUrl))
      .setColor(0x4c78af)
      .setTimestamp(new Date(boss.updatedAt || Date.now()));
  }

  if (isBossCountUp(boss)) {
    const clampedProgress =
      boss.currentHp > boss.maxHp ? boss.maxHp : boss.currentHp;
    const progressPercent = Number((clampedProgress * 10000n) / boss.maxHp) / 100;

    return new EmbedBuilder()
      .setTitle(boss.name)
      .setDescription(
        [
          buildBossHpBar(boss.currentHp, boss.maxHp),
          "",
          `Progress: ${formatBossHp(boss.currentHp)} / ${formatBossHp(boss.maxHp)} (${progressPercent.toFixed(2)}%)`,
          boss.currentHp >= boss.maxHp ? "The target has been reached." : "Progress continues.",
        ].join("\n"),
      )
      .setImage(normalizeBossImageUrl(boss.imageUrl))
      .setColor(boss.currentHp >= boss.maxHp ? 0x4caf50 : 0x4c78af)
      .setTimestamp(new Date(boss.updatedAt || Date.now()));
  }

  const damageDealt = boss.maxHp - boss.currentHp;
  const progressPercent = Number((damageDealt * 10000n) / boss.maxHp) / 100;

  return new EmbedBuilder()
    .setTitle(boss.name)
    .setDescription(
      [
        buildBossHpBar(boss.currentHp, boss.maxHp),
        "",
        `Damage dealt: ${formatBossHp(damageDealt)} (${progressPercent.toFixed(2)}%)`,
        boss.currentHp === 0n ? "The boss has been defeated." : "The fight continues.",
      ].join("\n"),
    )
    .setImage(normalizeBossImageUrl(boss.imageUrl))
    .setColor(boss.currentHp === 0n ? 0x4caf50 : 0xb73a3a)
    .setTimestamp(new Date(boss.updatedAt || Date.now()));
}


function buildBossHealthEmbed(boss) {
  if (isBossUnbounded(boss)) {
    return new EmbedBuilder()
      .setTitle(`${boss.name} Progress`)
      .setDescription(`Progress: ${formatBossHp(boss.currentHp)} / ∞`)
      .setColor(0x4c78af)
      .setTimestamp(new Date(boss.updatedAt || Date.now()));
  }

  if (isBossCountUp(boss)) {
    const clampedProgress =
      boss.currentHp > boss.maxHp ? boss.maxHp : boss.currentHp;
    const progressPercent = Number((clampedProgress * 10000n) / boss.maxHp) / 100;

    return new EmbedBuilder()
      .setTitle(`${boss.name} Progress`)
      .setDescription(
        [
          buildBossHpBar(boss.currentHp, boss.maxHp),
          "",
          `Progress: ${formatBossHp(boss.currentHp)} / ${formatBossHp(boss.maxHp)} (${progressPercent.toFixed(2)}%)`,
          boss.currentHp >= boss.maxHp ? "The target has been reached." : "Progress continues.",
        ].join("\n"),
      )
      .setColor(boss.currentHp >= boss.maxHp ? 0x4caf50 : 0x4c78af)
      .setTimestamp(new Date(boss.updatedAt || Date.now()));
  }

  const damageDealt = boss.maxHp - boss.currentHp;
  const progressPercent = Number((damageDealt * 10000n) / boss.maxHp) / 100;

  return new EmbedBuilder()
    .setTitle(`${boss.name} Health`)
    .setDescription(
      [
        buildBossHpBar(boss.currentHp, boss.maxHp),
        "",
        `Damage dealt: ${formatBossHp(damageDealt)} (${progressPercent.toFixed(2)}%)`,
        boss.currentHp === 0n ? "The boss has been defeated." : "The fight continues.",
      ].join("\n"),
    )
    .setColor(boss.currentHp === 0n ? 0x4caf50 : 0xb73a3a)
    .setTimestamp(new Date(boss.updatedAt || Date.now()));
}


function buildBossLogEmbed(boss, entries) {
  const lines = entries.map((entry) => {
    const sign =
      isBossCountUp(boss)
        ? entry.entryType === "heal"
          ? "-"
          : "+"
        : entry.entryType === "heal"
          ? "+"
          : "-";
    const multiplierText =
      entry.entryType === "damage" &&
      entry.baseAmount &&
      entry.questLevel &&
      entry.questMultiplier
        ? ` (${formatBossHp(entry.baseAmount)} x ${entry.questMultiplier.toString()} for quest level ${entry.questLevel})`
        : "";
    const reason = entry.reason ? ` - ${truncateValue(entry.reason, 160)}` : "";
    return `<t:${Math.floor(new Date(entry.createdAt).getTime() / 1000)}:R> ${sign}${formatBossHp(entry.amount)}${multiplierText} by <@${entry.discordUserId}>${reason}`;
  });

  return new EmbedBuilder()
    .setTitle(`${boss.name} Log`)
    .setDescription(lines.length ? lines.join("\n") : "No entries recorded yet.")
    .setColor(0xb73a3a);
}


async function getActiveBoss(client = pool, { lock = false } = {}) {
  const result = await client.query(
    `
    SELECT
      id,
      name,
      max_hp,
      current_hp,
      tracking_mode,
      image_url,
      status_channel_id,
      status_message_id,
      is_active,
      created_at,
      updated_at
    FROM event_bosses
    WHERE is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1
    ${lock ? "FOR UPDATE" : ""}
    `,
  );

  return mapBossRow(result.rows[0]);
}


async function startBossFight({ name, maxHp, imageUrl, trackingMode = "countdown" }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
      UPDATE event_bosses
      SET is_active = FALSE, updated_at = NOW()
      WHERE is_active = TRUE
      `,
    );

    const storedMaxHp = maxHp || 1n;
    const currentHp = trackingMode === "countdown" ? storedMaxHp : 0n;

    const result = await client.query(
      `
      INSERT INTO event_bosses (name, max_hp, current_hp, tracking_mode, image_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        name,
        max_hp,
        current_hp,
        tracking_mode,
        image_url,
        status_channel_id,
        status_message_id,
        is_active,
        created_at,
        updated_at
      `,
      [name, storedMaxHp.toString(), currentHp.toString(), trackingMode, imageUrl || null],
    );

    await client.query("COMMIT");
    return mapBossRow(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


async function recordBossHpEntry({
  discordUserId,
  amount,
  entryType,
  reason,
  baseAmount,
  questLevel,
  questMultiplier,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const boss = await getActiveBoss(client, { lock: true });
    if (!boss) {
      await client.query("ROLLBACK");
      return null;
    }

    let nextHp;
    if (isBossCountUp(boss)) {
      nextHp =
        entryType === "heal"
          ? boss.currentHp - amount < 0n
            ? 0n
            : boss.currentHp - amount
          : boss.currentHp + amount;
    } else {
      nextHp =
        entryType === "heal"
          ? boss.currentHp + amount > boss.maxHp
            ? boss.maxHp
            : boss.currentHp + amount
          : boss.currentHp - amount < 0n
            ? 0n
            : boss.currentHp - amount;
    }

    const result = await client.query(
      `
      UPDATE event_bosses
      SET current_hp = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        name,
        max_hp,
        current_hp,
        tracking_mode,
        image_url,
        status_channel_id,
        status_message_id,
        is_active,
        created_at,
        updated_at
      `,
      [boss.id, nextHp.toString()],
    );

    await client.query(
      `
      INSERT INTO event_boss_damage_log (
        boss_id,
        discord_user_id,
        amount,
        base_amount,
        quest_level,
        quest_multiplier,
        entry_type,
        reason
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        boss.id,
        discordUserId,
        amount.toString(),
        baseAmount ? baseAmount.toString() : null,
        questLevel || null,
        questMultiplier ? questMultiplier.toString() : null,
        entryType,
        reason?.trim() || null,
      ],
    );

    await client.query("COMMIT");
    return mapBossRow(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


async function listBossLogEntries(bossId, limit = 10) {
  const result = await pool.query(
    `
    SELECT
      discord_user_id,
      amount,
      base_amount,
      quest_level,
      quest_multiplier,
      entry_type,
      reason,
      created_at
    FROM event_boss_damage_log
    WHERE boss_id = $1
    ORDER BY created_at DESC, id DESC
    LIMIT $2
    `,
    [bossId, limit],
  );

  return result.rows.map((row) => ({
    discordUserId: row.discord_user_id,
    amount: BigInt(row.amount),
    baseAmount: row.base_amount === null ? null : BigInt(row.base_amount),
    questLevel: row.quest_level === null ? null : Number(row.quest_level),
    questMultiplier:
      row.quest_multiplier === null ? null : BigInt(row.quest_multiplier),
    entryType: row.entry_type,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}


async function postOrRefreshBossStatus(interaction, boss, { forceNew = false } = {}) {
  const embed = buildBossStatusEmbed(boss);
  const targetChannelId =
    boss.statusChannelId || config.bossStatusChannelId || interaction.channelId;
  const targetChannel = await interaction.client.channels.fetch(targetChannelId);

  if (!targetChannel?.send || !targetChannel.messages) {
    throw new Error("Boss status channel is not a text channel.");
  }

  if (boss.statusMessageId && !forceNew) {
    try {
      const message = await targetChannel.messages.fetch(boss.statusMessageId);
      await message.edit({ embeds: [embed] });
      return { channelId: targetChannelId, messageId: message.id, created: false };
    } catch (error) {
      console.error("Failed to edit boss status message; creating a new one:", error);
    }
  }

  const message = await targetChannel.send({ embeds: [embed] });
  await pool.query(
    `
    UPDATE event_bosses
    SET status_channel_id = $2, status_message_id = $3, updated_at = NOW()
    WHERE id = $1
    `,
    [boss.id, targetChannelId, message.id],
  );

  return { channelId: targetChannelId, messageId: message.id, created: true };
}


module.exports = {
  buildBossHealthEmbed,
  buildBossLogEmbed,
  buildBossStatusEmbed,
  formatBossHp,
  getActiveBoss,
  listBossLogEntries,
  postOrRefreshBossStatus,
  recordBossHpEntry,
  startBossFight,
};
