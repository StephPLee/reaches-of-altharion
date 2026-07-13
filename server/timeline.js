const { pool } = require("./db");

function mapEventRow(row) {
  return row
    ? {
        id: row.id,
        title: row.title,
        description: row.description,
        eraLabel: row.era_label,
        sortValue: Number(row.sort_value),
        category: row.category,
        linkedWikiSlug: row.linked_wiki_slug,
        imagePath: row.image_path,
        isDraft: row.is_draft,
        updatedAt: row.updated_at,
      }
    : null;
}

async function listTimelineEvents({ includeDrafts = false } = {}) {
  const whereClause = includeDrafts ? "" : "WHERE is_draft = false";
  const result = await pool.query(
    `
    SELECT id, title, description, era_label, sort_value, category,
           linked_wiki_slug, image_path, is_draft, updated_at
    FROM timeline_events
    ${whereClause}
    ORDER BY sort_value ASC, id ASC
    `,
  );
  return result.rows.map(mapEventRow);
}

async function createTimelineEvent({
  title,
  description,
  eraLabel,
  sortValue,
  category,
  linkedWikiSlug,
  imagePath,
  isDraft,
  createdByUserId,
}) {
  const result = await pool.query(
    `
    INSERT INTO timeline_events (
      title, description, era_label, sort_value, category,
      linked_wiki_slug, image_path, is_draft, created_by_user_id, updated_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
    RETURNING id, title, description, era_label, sort_value, category,
              linked_wiki_slug, image_path, is_draft, updated_at
    `,
    [
      title.trim().slice(0, 200),
      description || "",
      eraLabel.trim().slice(0, 120),
      sortValue,
      category || null,
      linkedWikiSlug || null,
      imagePath || null,
      Boolean(isDraft),
      createdByUserId || null,
    ],
  );
  return mapEventRow(result.rows[0]);
}

async function updateTimelineEvent({
  eventId,
  title,
  description,
  eraLabel,
  sortValue,
  category,
  linkedWikiSlug,
  imagePath,
  isDraft,
  updatedByUserId,
}) {
  const result = await pool.query(
    `
    UPDATE timeline_events
    SET
      title = $2,
      description = $3,
      era_label = $4,
      sort_value = $5,
      category = $6,
      linked_wiki_slug = $7,
      image_path = $8,
      is_draft = $9,
      updated_by_user_id = $10,
      updated_at = NOW()
    WHERE id = $1
    RETURNING id, title, description, era_label, sort_value, category,
              linked_wiki_slug, image_path, is_draft, updated_at
    `,
    [
      eventId,
      title.trim().slice(0, 200),
      description || "",
      eraLabel.trim().slice(0, 120),
      sortValue,
      category || null,
      linkedWikiSlug || null,
      imagePath || null,
      Boolean(isDraft),
      updatedByUserId || null,
    ],
  );
  return mapEventRow(result.rows[0]);
}

async function deleteTimelineEvent(eventId) {
  const result = await pool.query(`DELETE FROM timeline_events WHERE id = $1`, [eventId]);
  return result.rowCount > 0;
}

module.exports = {
  listTimelineEvents,
  createTimelineEvent,
  updateTimelineEvent,
  deleteTimelineEvent,
};
