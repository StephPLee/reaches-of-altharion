const { pool } = require("./db");

function mapErrataRow(row) {
  return {
    id: Number(row.id),
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listErrata() {
  const result = await pool.query(
    `
    SELECT id, title, content, created_at, updated_at
    FROM errata
    ORDER BY created_at ASC, id ASC
    `,
  );

  return result.rows.map(mapErrataRow);
}

async function createErrata({ title, content }) {
  const result = await pool.query(
    `
    INSERT INTO errata (title, content)
    VALUES ($1, $2)
    RETURNING id, title, content, created_at, updated_at
    `,
    [title, content],
  );

  return mapErrataRow(result.rows[0]);
}

async function updateErrata({ errataId, title, content }) {
  const result = await pool.query(
    `
    UPDATE errata
    SET title = $2, content = $3, updated_at = NOW()
    WHERE id = $1
    RETURNING id, title, content, created_at, updated_at
    `,
    [errataId, title, content],
  );

  return result.rows[0] ? mapErrataRow(result.rows[0]) : null;
}

// Returns the deleted row's Discord message ids so the caller can remove the
// mirrored messages, or null if the errata did not exist.
async function deleteErrata(errataId) {
  const result = await pool.query(
    "DELETE FROM errata WHERE id = $1 RETURNING discord_message_ids",
    [errataId],
  );

  return result.rows[0] ? result.rows[0].discord_message_ids || [] : null;
}

module.exports = {
  createErrata,
  deleteErrata,
  listErrata,
  updateErrata,
};
