const { pool } = require("./db");

function mapBannedContentRow(row) {
  return {
    id: Number(row.id),
    sourcebookId: Number(row.sourcebook_entry_id),
    sourcebookTitle: row.sourcebook_title,
    sourcebookPublisher: row.sourcebook_publisher,
    sourcebookEdition: row.sourcebook_edition,
    contentType: row.content_type,
    title: row.title,
    notes: row.notes,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listBannedContentEntries({ includeUnpublished = false } = {}) {
  const result = await pool.query(
    `
    SELECT
      banned_content_entries.id,
      banned_content_entries.sourcebook_entry_id,
      sourcebook_entries.title AS sourcebook_title,
      sourcebook_entries.publisher AS sourcebook_publisher,
      sourcebook_entries.edition AS sourcebook_edition,
      banned_content_entries.content_type,
      banned_content_entries.title,
      banned_content_entries.notes,
      banned_content_entries.is_published,
      banned_content_entries.created_at,
      banned_content_entries.updated_at
    FROM banned_content_entries
    INNER JOIN sourcebook_entries
      ON sourcebook_entries.id = banned_content_entries.sourcebook_entry_id
    WHERE $1::boolean = true
      OR banned_content_entries.is_published = true
    ORDER BY
      CASE
        WHEN LOWER(sourcebook_entries.title) LIKE 'player''s handbook%' THEN 0
        ELSE 1
      END ASC,
      LOWER(sourcebook_entries.title) ASC,
      LOWER(banned_content_entries.title) ASC,
      LOWER(banned_content_entries.content_type) ASC,
      banned_content_entries.id ASC
    `,
    [includeUnpublished],
  );

  return result.rows.map(mapBannedContentRow);
}

async function createBannedContentEntry({
  sourcebookId,
  contentType,
  title,
  notes,
  isPublished,
  createdByUserId,
}) {
  const result = await pool.query(
    `
    INSERT INTO banned_content_entries (
      sourcebook_entry_id,
      content_type,
      title,
      notes,
      is_published,
      created_by_user_id,
      updated_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $6)
    RETURNING id
    `,
    [
      sourcebookId,
      contentType,
      title,
      notes,
      isPublished,
      createdByUserId,
    ],
  );

  const entries = await listBannedContentEntries({ includeUnpublished: true });
  return entries.find((entry) => entry.id === Number(result.rows[0].id));
}

async function updateBannedContentEntry({
  bannedContentId,
  sourcebookId,
  contentType,
  title,
  notes,
  isPublished,
  updatedByUserId,
}) {
  const result = await pool.query(
    `
    UPDATE banned_content_entries
    SET
      sourcebook_entry_id = $2,
      content_type = $3,
      title = $4,
      notes = $5,
      is_published = $6,
      updated_by_user_id = $7,
      updated_at = NOW()
    WHERE id = $1
    RETURNING id
    `,
    [
      bannedContentId,
      sourcebookId,
      contentType,
      title,
      notes,
      isPublished,
      updatedByUserId,
    ],
  );

  if (!result.rows[0]) {
    return null;
  }

  const entries = await listBannedContentEntries({ includeUnpublished: true });
  return entries.find((entry) => entry.id === Number(result.rows[0].id)) ?? null;
}

async function deleteBannedContentEntry(bannedContentId) {
  const result = await pool.query(
    `
    DELETE FROM banned_content_entries
    WHERE id = $1
    RETURNING id
    `,
    [bannedContentId],
  );

  return result.rows[0] || null;
}

module.exports = {
  createBannedContentEntry,
  deleteBannedContentEntry,
  listBannedContentEntries,
  updateBannedContentEntry,
};
