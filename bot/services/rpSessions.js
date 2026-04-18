const pool = require("../db");

function mapRpSessionRow(row) {
  return row
    ? {
        id: Number(row.id),
        guildId: row.guild_id,
        channelId: row.channel_id,
        startedByDiscordUserId: row.started_by_discord_user_id,
        status: row.status,
        activeStartedAt: row.active_started_at,
        activeSeconds: Number(row.active_seconds),
        startedAt: row.started_at,
        endedAt: row.ended_at,
        updatedAt: row.updated_at,
      }
    : null;
}


function formatRpDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const parts = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0 || hours > 0) {
    parts.push(`${minutes}m`);
  }

  if (hours === 0 && (remainingSeconds > 0 || parts.length === 0)) {
    parts.push(`${remainingSeconds}s`);
  }

  return parts.join(" ");
}


async function getOpenRpSession(client, { guildId, channelId, lock = false }) {
  const result = await client.query(
    `
    SELECT
      id,
      guild_id,
      channel_id,
      started_by_discord_user_id,
      status,
      active_started_at,
      active_seconds,
      started_at,
      ended_at,
      updated_at
    FROM rp_sessions
    WHERE guild_id = $1
      AND channel_id = $2
      AND status IN ('active', 'paused')
    ORDER BY started_at DESC
    LIMIT 1
    ${lock ? "FOR UPDATE" : ""}
    `,
    [guildId, channelId],
  );

  return mapRpSessionRow(result.rows[0]);
}


async function getRpSessionStatus({ guildId, channelId }) {
  const result = await pool.query(
    `
    SELECT
      id,
      guild_id,
      channel_id,
      started_by_discord_user_id,
      status,
      active_started_at,
      CASE
        WHEN status = 'active' AND active_started_at IS NOT NULL THEN
          active_seconds + GREATEST(
            0,
            FLOOR(EXTRACT(EPOCH FROM (NOW() - active_started_at)))::BIGINT
          )
        ELSE active_seconds
      END AS active_seconds,
      started_at,
      ended_at,
      updated_at
    FROM rp_sessions
    WHERE guild_id = $1
      AND channel_id = $2
      AND status IN ('active', 'paused')
    ORDER BY started_at DESC
    LIMIT 1
    `,
    [guildId, channelId],
  );

  return mapRpSessionRow(result.rows[0]);
}


function canManageRpSession(session, { userId, canManageAny }) {
  return canManageAny || session.startedByDiscordUserId === userId;
}


async function startRpSession({ guildId, channelId, userId }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await getOpenRpSession(client, {
      guildId,
      channelId,
      lock: true,
    });

    if (existing) {
      await client.query("COMMIT");
      return { status: "already_open", session: existing };
    }

    const result = await client.query(
      `
      INSERT INTO rp_sessions (
        guild_id,
        channel_id,
        started_by_discord_user_id,
        status,
        active_started_at
      )
      VALUES ($1, $2, $3, 'active', NOW())
      RETURNING
        id,
        guild_id,
        channel_id,
        started_by_discord_user_id,
        status,
        active_started_at,
        active_seconds,
        started_at,
        ended_at,
        updated_at
      `,
      [guildId, channelId, userId],
    );

    await client.query("COMMIT");
    return { status: "started", session: mapRpSessionRow(result.rows[0]) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


async function pauseRpSession({ guildId, channelId, userId, canManageAny }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const session = await getOpenRpSession(client, {
      guildId,
      channelId,
      lock: true,
    });

    if (!session) {
      await client.query("COMMIT");
      return { status: "not_found" };
    }

    if (!canManageRpSession(session, { userId, canManageAny })) {
      await client.query("COMMIT");
      return { status: "not_allowed", session };
    }

    if (session.status === "paused") {
      await client.query("COMMIT");
      return { status: "already_paused", session };
    }

    const result = await client.query(
      `
      UPDATE rp_sessions
      SET
        status = 'paused',
        active_seconds = active_seconds + GREATEST(
          0,
          FLOOR(EXTRACT(EPOCH FROM (NOW() - active_started_at)))::BIGINT
        ),
        active_started_at = NULL,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        guild_id,
        channel_id,
        started_by_discord_user_id,
        status,
        active_started_at,
        active_seconds,
        started_at,
        ended_at,
        updated_at
      `,
      [session.id],
    );

    await client.query("COMMIT");
    return { status: "paused", session: mapRpSessionRow(result.rows[0]) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


async function resumeRpSession({ guildId, channelId, userId, canManageAny }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const session = await getOpenRpSession(client, {
      guildId,
      channelId,
      lock: true,
    });

    if (!session) {
      await client.query("COMMIT");
      return { status: "not_found" };
    }

    if (!canManageRpSession(session, { userId, canManageAny })) {
      await client.query("COMMIT");
      return { status: "not_allowed", session };
    }

    if (session.status === "active") {
      await client.query("COMMIT");
      return { status: "already_active", session };
    }

    const result = await client.query(
      `
      UPDATE rp_sessions
      SET
        status = 'active',
        active_started_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        guild_id,
        channel_id,
        started_by_discord_user_id,
        status,
        active_started_at,
        active_seconds,
        started_at,
        ended_at,
        updated_at
      `,
      [session.id],
    );

    await client.query("COMMIT");
    return { status: "resumed", session: mapRpSessionRow(result.rows[0]) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


async function endRpSession({ guildId, channelId, userId, canManageAny }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const session = await getOpenRpSession(client, {
      guildId,
      channelId,
      lock: true,
    });

    if (!session) {
      await client.query("COMMIT");
      return { status: "not_found" };
    }

    if (!canManageRpSession(session, { userId, canManageAny })) {
      await client.query("COMMIT");
      return { status: "not_allowed", session };
    }

    const result = await client.query(
      `
      UPDATE rp_sessions
      SET
        status = 'ended',
        active_seconds = CASE
          WHEN status = 'active' AND active_started_at IS NOT NULL THEN
            active_seconds + GREATEST(
              0,
              FLOOR(EXTRACT(EPOCH FROM (NOW() - active_started_at)))::BIGINT
            )
          ELSE active_seconds
        END,
        active_started_at = NULL,
        ended_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        guild_id,
        channel_id,
        started_by_discord_user_id,
        status,
        active_started_at,
        active_seconds,
        started_at,
        ended_at,
        updated_at
      `,
      [session.id],
    );

    await client.query("COMMIT");
    return { status: "ended", session: mapRpSessionRow(result.rows[0]) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


module.exports = {
  endRpSession,
  formatRpDuration,
  getRpSessionStatus,
  pauseRpSession,
  resumeRpSession,
  startRpSession,
};
