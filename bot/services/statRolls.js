const pool = require("../db");

function roll4d6kh3() {
  const rolls = [0, 0, 0, 0].map(() => Math.floor(Math.random() * 6) + 1);
  const sorted = [...rolls].sort((a, b) => b - a);
  return sorted[0] + sorted[1] + sorted[2];
}

function rollStatLine() {
  return [0, 0, 0, 0, 0, 0].map(() => roll4d6kh3());
}

function isValidStatLine(stats) {
  const total = stats.reduce((a, b) => a + b, 0);
  if (total < 80 || total > 84) return false;
  if (stats.filter((v) => v > 12).length < 2) return false;
  if (stats.filter((v) => v > 15).length < 1) return false;
  if (stats.filter((v) => v < 10).length < 1) return false;
  return true;
}

function rollValidStatLine() {
  for (let i = 0; i < 100000; i++) {
    const line = rollStatLine();
    if (isValidStatLine(line)) return line;
  }
  throw new Error("Could not roll a valid stat line after 100000 attempts");
}

function rollFiveStatLines() {
  return [0, 0, 0, 0, 0].map(() => rollValidStatLine());
}

async function saveStatRollSets({ statLines, discordMessageUrl, rolledByDiscordUserId }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const saved = [];
    for (const stats of statLines) {
      const total = stats.reduce((a, b) => a + b, 0);
      const result = await client.query(
        `INSERT INTO stat_roll_sets (stats, total, discord_message_url, rolled_by_discord_user_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, stats, total, discord_message_url, created_at`,
        [stats, total, discordMessageUrl, rolledByDiscordUserId],
      );
      saved.push(mapRow(result.rows[0]));
    }
    await client.query("COMMIT");
    return saved;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

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

module.exports = {
  rollFiveStatLines,
  saveStatRollSets,
  mapRow,
};
