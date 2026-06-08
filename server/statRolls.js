const { editChannelMessage } = require("./discord");
const { pool } = require("./db");

function mapRow(row) {
  return {
    id: Number(row.id),
    stats: row.stats,
    total: Number(row.total),
    discordMessageUrl: row.discord_message_url,
    rolledByDiscordUserId: row.rolled_by_discord_user_id ?? null,
    rolledByUsername: row.rolled_by_username ?? null,
    claimedByDiscordUserId: row.claimed_by_discord_user_id ?? null,
    claimedByUsername: row.claimed_by_username ?? null,
    claimedAt: row.claimed_at ? row.claimed_at.toISOString() : null,
    lockedUntil: row.locked_until ? row.locked_until.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

async function listStatRollSets() {
  const result = await pool.query(
    `SELECT s.id, s.stats, s.total, s.discord_message_url,
            s.rolled_by_discord_user_id, s.claimed_by_discord_user_id,
            s.claimed_at, s.locked_until, s.created_at,
            COALESCE(claimer.global_name, claimer.username) AS claimed_by_username,
            COALESCE(roller.global_name, roller.username) AS rolled_by_username
     FROM stat_roll_sets s
     LEFT JOIN users claimer ON claimer.discord_user_id = s.claimed_by_discord_user_id
     LEFT JOIN users roller ON roller.discord_user_id = s.rolled_by_discord_user_id
     ORDER BY s.created_at DESC`,
  );
  return result.rows.map(mapRow);
}

async function claimStatRollSet({ id, discordUserId }) {
  const lockCheck = await pool.query(
    `SELECT rolled_by_discord_user_id, locked_until
     FROM stat_roll_sets
     WHERE id = $1 AND claimed_by_discord_user_id IS NULL`,
    [id],
  );

  const row = lockCheck.rows[0];
  if (!row) return null;

  if (
    row.locked_until &&
    new Date() < new Date(row.locked_until) &&
    row.rolled_by_discord_user_id !== discordUserId
  ) {
    const error = new Error(
      "This stat roll set is reserved for the roller for 12 hours after rolling.",
    );
    error.locked = true;
    throw error;
  }

  const result = await pool.query(
    `WITH updated AS (
       UPDATE stat_roll_sets
       SET claimed_by_discord_user_id = $2, claimed_at = NOW()
       WHERE id = $1 AND claimed_by_discord_user_id IS NULL
       RETURNING id, stats, total, discord_message_url, claimed_by_discord_user_id, claimed_at, created_at
     )
     SELECT u.*, COALESCE(usr.global_name, usr.username) AS claimed_by_username
     FROM updated u
     LEFT JOIN users usr ON usr.discord_user_id = u.claimed_by_discord_user_id`,
    [id, discordUserId],
  );
  if (result.rowCount === 0) return null;
  return mapRow(result.rows[0]);
}

async function updateDiscordStatMessage(discordMessageUrl) {
  const parts = discordMessageUrl.split("/");
  const messageId = parts[parts.length - 1];
  const channelId = parts[parts.length - 2];

  const result = await pool.query(
    `SELECT s.id, s.stats, s.total, s.rolled_by_discord_user_id,
            s.claimed_by_discord_user_id,
            COALESCE(claimer.global_name, claimer.username) AS claimed_by_username
     FROM stat_roll_sets s
     LEFT JOIN users claimer ON claimer.discord_user_id = s.claimed_by_discord_user_id
     WHERE s.discord_message_url = $1
     ORDER BY s.id ASC`,
    [discordMessageUrl],
  );

  if (result.rows.length === 0) return;

  const rolledByDiscordUserId = result.rows[0].rolled_by_discord_user_id;

  const lines = result.rows.map((row, i) => {
    const stats = row.stats.join(", ");
    const total = Number(row.total);
    const base = `**Set ${i + 1}** — ${stats} *(total: ${total})*`;
    return row.claimed_by_username
      ? `${base} — Claimed by ${row.claimed_by_username}`
      : base;
  });

  const content = [
    "## Stat Rolls",
    "",
    ...lines,
    "",
    `Rolled by <@${rolledByDiscordUserId}>`,
  ].join("\n");

  await editChannelMessage(channelId, messageId, { content });
}

module.exports = {
  claimStatRollSet,
  listStatRollSets,
  updateDiscordStatMessage,
};
