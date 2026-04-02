const { pool } = require("./db");

function normalizeDateValue(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return String(value).slice(0, 10);
}

function mapCalendarRow(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    startDate: normalizeDateValue(row.start_date),
    endDate: normalizeDateValue(row.end_date),
    category: row.category,
    summary: row.summary,
    details: row.details,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listPublishedCalendarEvents() {
  const result = await pool.query(
    `
    SELECT
      id,
      title,
      slug,
      start_date,
      end_date,
      category,
      summary,
      details,
      is_published,
      created_at,
      updated_at
    FROM calendar_events
    WHERE is_published = true
    ORDER BY start_date ASC, end_date ASC, id ASC
    `,
  );

  return result.rows.map(mapCalendarRow);
}

async function createCalendarEvent({
  title,
  slug,
  startDate,
  endDate,
  category,
  summary,
  details,
  createdByUserId,
}) {
  const result = await pool.query(
    `
    INSERT INTO calendar_events (
      title,
      slug,
      start_date,
      end_date,
      category,
      summary,
      details,
      is_published,
      created_by_user_id,
      updated_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $8)
    RETURNING
      id,
      title,
      slug,
      start_date,
      end_date,
      category,
      summary,
      details,
      is_published,
      created_at,
      updated_at
    `,
    [
      title,
      slug,
      startDate,
      endDate,
      category,
      summary,
      details,
      createdByUserId,
    ],
  );

  return mapCalendarRow(result.rows[0]);
}

async function updateCalendarEvent({
  eventId,
  title,
  startDate,
  endDate,
  category,
  summary,
  details,
  updatedByUserId,
}) {
  const result = await pool.query(
    `
    UPDATE calendar_events
    SET
      title = $2,
      start_date = $3,
      end_date = $4,
      category = $5,
      summary = $6,
      details = $7,
      updated_by_user_id = $8,
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      title,
      slug,
      start_date,
      end_date,
      category,
      summary,
      details,
      is_published,
      created_at,
      updated_at
    `,
    [
      eventId,
      title,
      startDate,
      endDate,
      category,
      summary,
      details,
      updatedByUserId,
    ],
  );

  return result.rows[0] ? mapCalendarRow(result.rows[0]) : null;
}

async function deleteCalendarEvent(eventId) {
  const result = await pool.query(
    `
    DELETE FROM calendar_events
    WHERE id = $1
    RETURNING id
    `,
    [eventId],
  );

  return result.rows[0] || null;
}

module.exports = {
  createCalendarEvent,
  deleteCalendarEvent,
  listPublishedCalendarEvents,
  updateCalendarEvent,
};
