const { pool } = require("./db");

function mapRow(row) {
  return {
    id: Number(row.id),
    stats: row.stats,
    total: Number(row.total),
    discordMessageUrl: row.discord_message_url,
    claimedByDiscordUserId: row.claimed_by_discord_user_id ?? null,
    claimedAt: row.claimed_at ? row.claimed_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

async function listUnclaimedStatRollSets() {
  const result = await pool.query(
    `SELECT id, stats, total, discord_message_url, claimed_by_discord_user_id, claimed_at, created_at
     FROM stat_roll_sets
     WHERE claimed_by_discord_user_id IS NULL
     ORDER BY created_at ASC`,
  );
  return result.rows.map(mapRow);
}

async function claimStatRollSet({ id, discordUserId }) {
  const result = await pool.query(
    `UPDATE stat_roll_sets
     SET claimed_by_discord_user_id = $2, claimed_at = NOW()
     WHERE id = $1 AND claimed_by_discord_user_id IS NULL
     RETURNING id, stats, total, discord_message_url, claimed_by_discord_user_id, claimed_at, created_at`,
    [id, discordUserId],
  );
  if (result.rowCount === 0) return null;
  return mapRow(result.rows[0]);
}

module.exports = {
  claimStatRollSet,
  listUnclaimedStatRollSets,
};
