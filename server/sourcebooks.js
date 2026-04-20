const { pool } = require("./db");

function mapSourcebookRow(row) {
  return {
    id: Number(row.id),
    listType: row.list_type,
    title: row.title,
    publisher: row.publisher,
    type: row.book_type,
    edition: row.edition,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
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
      publisher,
      book_type,
      edition,
      sort_order,
      is_published,
      created_at,
      updated_at
    FROM sourcebook_entries
    WHERE $1::boolean = true
      OR is_published = true
    ORDER BY
      CASE list_type
        WHEN 'not_allowed' THEN 0
        ELSE 1
      END ASC,
      sort_order ASC,
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
      publisher,
      book_type,
      edition,
      sort_order,
      is_published,
      created_by_user_id,
      updated_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
    RETURNING
      id,
      list_type,
      title,
      publisher,
      book_type,
      edition,
      sort_order,
      is_published,
      created_at,
      updated_at
    `,
    [
      listType,
      title,
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
      publisher = $4,
      book_type = $5,
      edition = $6,
      sort_order = $7,
      is_published = $8,
      updated_by_user_id = $9,
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      list_type,
      title,
      publisher,
      book_type,
      edition,
      sort_order,
      is_published,
      created_at,
      updated_at
    `,
    [
      sourcebookId,
      listType,
      title,
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
