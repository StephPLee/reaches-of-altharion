const { pool } = require("./db");

function mapSourcebookRow(row) {
  return {
    id: Number(row.id),
    listType: row.list_type,
    title: row.title,
    code: row.code,
    publisher: row.publisher,
    type: row.book_type,
    edition: row.edition,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
    bannedContentCount: Number(row.banned_content_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listSourcebooks({ includeUnpublished = false } = {}) {
  const result = await pool.query(
    `
    SELECT
      id,
      list_type,
      title,
      code,
      publisher,
      book_type,
      edition,
      sort_order,
      is_published,
      COALESCE(banned_content_counts.entry_count, 0) AS banned_content_count,
      created_at,
      updated_at
    FROM sourcebook_entries
    LEFT JOIN (
      SELECT sourcebook_entry_id, COUNT(*) AS entry_count
      FROM banned_content_entries
      WHERE $1::boolean = true OR is_published = true
      GROUP BY sourcebook_entry_id
    ) AS banned_content_counts
      ON banned_content_counts.sourcebook_entry_id = sourcebook_entries.id
    WHERE $1::boolean = true
      OR is_published = true
    ORDER BY
      CASE list_type
        WHEN 'not_allowed' THEN 0
        ELSE 1
      END ASC,
      CASE WHEN LOWER(publisher) = 'wizards of the coast' THEN 0 ELSE 1 END ASC,
      LOWER(publisher) ASC,
      LOWER(title) ASC,
      id ASC
    `,
    [includeUnpublished],
  );

  return result.rows.map(mapSourcebookRow);
}

async function createSourcebook({
  listType,
  title,
  code,
  publisher,
  type,
  edition,
  sortOrder,
  isPublished,
  createdByUserId,
}) {
  const result = await pool.query(
    `
    INSERT INTO sourcebook_entries (
      list_type,
      title,
      code,
      publisher,
      book_type,
      edition,
      sort_order,
      is_published,
      created_by_user_id,
      updated_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
    RETURNING
      id,
      list_type,
      title,
      code,
      publisher,
      book_type,
      edition,
      sort_order,
      is_published,
      0 AS banned_content_count,
      created_at,
      updated_at
    `,
    [
      listType,
      title,
      code,
      publisher,
      type,
      edition,
      sortOrder,
      isPublished,
      createdByUserId,
    ],
  );

  return mapSourcebookRow(result.rows[0]);
}

async function updateSourcebook({
  sourcebookId,
  listType,
  title,
  code,
  publisher,
  type,
  edition,
  sortOrder,
  isPublished,
  updatedByUserId,
}) {
  const result = await pool.query(
    `
    UPDATE sourcebook_entries
    SET
      list_type = $2,
      title = $3,
      code = $4,
      publisher = $5,
      book_type = $6,
      edition = $7,
      sort_order = $8,
      is_published = $9,
      updated_by_user_id = $10,
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      list_type,
      title,
      code,
      publisher,
      book_type,
      edition,
      sort_order,
      is_published,
      0 AS banned_content_count,
      created_at,
      updated_at
    `,
    [
      sourcebookId,
      listType,
      title,
      code,
      publisher,
      type,
      edition,
      sortOrder,
      isPublished,
      updatedByUserId,
    ],
  );

  return result.rows[0] ? mapSourcebookRow(result.rows[0]) : null;
}

async function deleteSourcebook(sourcebookId) {
  const result = await pool.query(
    `
    DELETE FROM sourcebook_entries
    WHERE id = $1
    RETURNING id
    `,
    [sourcebookId],
  );

  return result.rows[0] || null;
}

module.exports = {
  createSourcebook,
  deleteSourcebook,
  listSourcebooks,
  updateSourcebook,
};
