const { pool } = require("./db");

function mapRow(row) {
  return {
    id: Number(row.id),
    stats: row.stats,
    total: Number(row.total),
    discordMessageUrl: row.discord_message_url,
    claimedByDiscordUserId: row.claimed_by_discord_user_id ?? null,
    claimedByUsername: row.claimed_by_username ?? null,
    claimedAt: row.claimed_at ? row.claimed_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

async function listStatRollSets() {
  const result = await pool.query(
    `SELECT s.id, s.stats, s.total, s.discord_message_url,
            s.claimed_by_discord_user_id, s.claimed_at, s.created_at,
            COALESCE(u.global_name, u.username) AS claimed_by_username
     FROM stat_roll_sets s
     LEFT JOIN users u ON u.discord_user_id = s.claimed_by_discord_user_id
     ORDER BY s.claimed_at ASC NULLS FIRST, s.created_at ASC`,
  );
  return result.rows.map(mapRow);
}

async function claimStatRollSet({ id, discordUserId }) {
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

module.exports = {
  claimStatRollSet,
  listStatRollSets,
};
