const pool = require("../db");

async function getOrAssignCampaign(discordUserId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `
      SELECT c.code, c.invite_url
      FROM cc_assignments a
      JOIN cc_campaigns c ON c.id = a.campaign_id
      WHERE a.discord_user_id = $1
      LIMIT 1
      `,
      [discordUserId],
    );

    if (existing.rows.length > 0) {
      await client.query(
        `
        UPDATE cc_assignments
        SET last_requested_at = NOW()
        WHERE discord_user_id = $1
        `,
        [discordUserId],
      );
      await client.query(
        `
        INSERT INTO cc_audit_log (discord_user_id, action, metadata)
        VALUES ($1, 'reissued', '{}'::jsonb)
        `,
        [discordUserId],
      );
      await client.query("COMMIT");
      return existing.rows[0];
    }

    const assignment = await client.query(
      `
      WITH pick AS (
        SELECT c.id
        FROM cc_campaigns c
        LEFT JOIN cc_assignments a ON a.campaign_id = c.id
        WHERE c.active = true
        GROUP BY c.id
        ORDER BY COUNT(a.discord_user_id) ASC, c.id ASC
        LIMIT 1
      ),
      inserted AS (
        INSERT INTO cc_assignments (discord_user_id, campaign_id)
        SELECT $1, pick.id
        FROM pick
        RETURNING campaign_id
      )
      SELECT c.code, c.invite_url, c.id AS campaign_id
      FROM inserted i
      JOIN cc_campaigns c ON c.id = i.campaign_id
      `,
      [discordUserId],
    );

    if (assignment.rows.length === 0) {
      await client.query(
        `
        INSERT INTO cc_audit_log (discord_user_id, action, metadata)
        VALUES ($1, 'denied', '{"reason":"no_active_campaigns"}'::jsonb)
        `,
        [discordUserId],
      );
      await client.query("COMMIT");
      return null;
    }

    const picked = assignment.rows[0];
    await client.query(
      `
      INSERT INTO cc_audit_log (discord_user_id, action, campaign_id, metadata)
      VALUES ($1, 'issued', $2, '{}'::jsonb)
      `,
      [discordUserId, picked.campaign_id],
    );

    await client.query("COMMIT");
    return picked;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


module.exports = {
  getOrAssignCampaign,
};
