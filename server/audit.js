const { pool } = require("./db");

async function recordAuditEvent({
  action,
  status,
  userId = null,
  discordUserId = null,
  ipAddress = null,
  userAgent = null,
  metadata = {},
}) {
  try {
    await pool.query(
      `
      INSERT INTO auth_audit_log (
        user_id,
        discord_user_id,
        action,
        status,
        ip_address,
        user_agent,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      `,
      [
        userId,
        discordUserId,
        action,
        status,
        ipAddress,
        userAgent,
        JSON.stringify(metadata),
      ],
    );
  } catch (error) {
    if (error && error.code === "42P01") {
      console.warn(
        "auth_audit_log table is missing. Run the auth hardening migration.",
      );
      return;
    }

    console.error("Failed to write audit event:", error);
  }
}

module.exports = {
  recordAuditEvent,
};
