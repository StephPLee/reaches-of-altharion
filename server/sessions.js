const crypto = require("node:crypto");
const { pool } = require("./db");
const { sessionTtlDays } = require("./config");

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createRawSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

async function upsertUser({ discordUser, isStaff }) {
  const result = await pool.query(
    `
    INSERT INTO users (
      discord_user_id,
      username,
      global_name,
      avatar,
      is_staff,
      last_guild_check_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (discord_user_id)
    DO UPDATE SET
      username = EXCLUDED.username,
      global_name = EXCLUDED.global_name,
      avatar = EXCLUDED.avatar,
      is_staff = EXCLUDED.is_staff,
      last_guild_check_at = NOW(),
      updated_at = NOW()
    RETURNING id, discord_user_id, username, global_name, avatar, is_staff
    `,
    [
      discordUser.id,
      discordUser.username,
      discordUser.global_name,
      discordUser.avatar,
      isStaff,
    ],
  );

  return result.rows[0];
}

async function updateUserStaffStatus({ discordUserId, isStaff }) {
  const result = await pool.query(
    `
    UPDATE users
    SET
      is_staff = $2,
      last_guild_check_at = NOW(),
      updated_at = NOW()
    WHERE discord_user_id = $1
    RETURNING
      id,
      discord_user_id,
      username,
      global_name,
      avatar,
      is_staff,
      last_guild_check_at
    `,
    [discordUserId, isStaff],
  );

  return result.rows[0] || null;
}

async function createSession(userId) {
  await deleteSessionsForUser(userId);

  const token = createRawSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + sessionTtlDays * 24 * 60 * 60 * 1000);

  await pool.query(
    `
    INSERT INTO admin_sessions (
      user_id,
      session_token_hash,
      expires_at
    )
    VALUES ($1, $2, $3)
    `,
    [userId, tokenHash, expiresAt],
  );

  return { token, expiresAt };
}

async function getSessionUser(sessionToken) {
  if (!sessionToken) {
    return null;
  }

  const tokenHash = hashSessionToken(sessionToken);
  const result = await pool.query(
    `
    SELECT
      s.id AS session_id,
      s.expires_at,
      u.id,
      u.discord_user_id,
      u.username,
      u.global_name,
      u.avatar,
      u.is_staff,
      u.last_guild_check_at
    FROM admin_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.session_token_hash = $1
      AND s.expires_at > NOW()
    LIMIT 1
    `,
    [tokenHash],
  );

  const session = result.rows[0];
  if (!session) {
    return null;
  }

  await pool.query(
    `
    UPDATE admin_sessions
    SET last_seen_at = NOW()
    WHERE id = $1
    `,
    [session.session_id],
  );

  return {
    id: session.id,
    discordUserId: session.discord_user_id,
    username: session.username,
    globalName: session.global_name,
    avatar: session.avatar,
    isStaff: session.is_staff,
    lastGuildCheckAt: session.last_guild_check_at,
    expiresAt: session.expires_at,
  };
}

async function deleteSession(sessionToken) {
  if (!sessionToken) {
    return;
  }

  const tokenHash = hashSessionToken(sessionToken);
  await pool.query(
    `
    DELETE FROM admin_sessions
    WHERE session_token_hash = $1
    `,
    [tokenHash],
  );
}

async function deleteSessionsForUser(userId) {
  await pool.query(
    `
    DELETE FROM admin_sessions
    WHERE user_id = $1
    `,
    [userId],
  );
}

async function deleteExpiredSessions() {
  const result = await pool.query(
    `
    DELETE FROM admin_sessions
    WHERE expires_at <= NOW()
    `,
  );

  return result.rowCount || 0;
}

module.exports = {
  createSession,
  deleteExpiredSessions,
  deleteSession,
  deleteSessionsForUser,
  getSessionUser,
  upsertUser,
  updateUserStaffStatus,
};
