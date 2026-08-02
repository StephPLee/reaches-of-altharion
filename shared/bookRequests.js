const TITLE_MAX_LENGTH = 200;
const NOTES_MAX_LENGTH = 1000;

function normalize(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

async function createBookRequest(pool, { discordUserId, username, title, notes, source }) {
  const normalizedTitle = normalize(title);
  if (!normalizedTitle) {
    const error = new Error("Book title is required.");
    error.statusCode = 400;
    throw error;
  }
  if (normalizedTitle.length > TITLE_MAX_LENGTH) {
    const error = new Error(`Book title must be ${TITLE_MAX_LENGTH.toLocaleString()} characters or fewer.`);
    error.statusCode = 400;
    throw error;
  }

  const normalizedNotes = normalize(notes);
  if (normalizedNotes.length > NOTES_MAX_LENGTH) {
    const error = new Error(`Notes must be ${NOTES_MAX_LENGTH.toLocaleString()} characters or fewer.`);
    error.statusCode = 400;
    throw error;
  }

  if (!["bot", "website"].includes(source)) {
    throw new Error("Invalid book request source.");
  }

  const result = await pool.query(
    `INSERT INTO book_requests (
       discord_user_id, requester_username, title, notes, source
     ) VALUES ($1, $2, $3, $4, $5)
     RETURNING id, discord_user_id, requester_username, title, notes, status, source, created_at`,
    [discordUserId, username, normalizedTitle, normalizedNotes || null, source],
  );
  return result.rows[0];
}

async function listOpenBookRequests(pool, viewerDiscordUserId) {
  const result = await pool.query(
    `SELECT
       br.id, br.discord_user_id, br.requester_username, br.title, br.notes,
       br.status, br.source, br.created_at,
       COUNT(u.id)::int AS upvote_count,
       bool_or(u.discord_user_id = $1) AS has_upvoted
     FROM book_requests br
     LEFT JOIN book_request_upvotes u ON u.request_id = br.id
     WHERE br.status = 'open'
     GROUP BY br.id
     ORDER BY COUNT(u.id) DESC, br.created_at ASC`,
    [viewerDiscordUserId],
  );
  return result.rows.map((row) => ({ ...row, has_upvoted: Boolean(row.has_upvoted) }));
}

async function toggleBookRequestUpvote(pool, { requestId, discordUserId }) {
  const removed = await pool.query(
    `DELETE FROM book_request_upvotes WHERE request_id = $1 AND discord_user_id = $2 RETURNING id`,
    [requestId, discordUserId],
  );
  if (removed.rows.length > 0) {
    return { upvoted: false };
  }

  await pool.query(
    `INSERT INTO book_request_upvotes (request_id, discord_user_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [requestId, discordUserId],
  );
  return { upvoted: true };
}

async function markBookRequestPurchased(pool, { requestId, staffDiscordUserId, staffUsername }) {
  const result = await pool.query(
    `UPDATE book_requests
     SET status = 'purchased',
         purchased_at = NOW(),
         purchased_by_discord_user_id = $2,
         purchased_by_username = $3
     WHERE id = $1 AND status = 'open'
     RETURNING id, discord_user_id, requester_username, title, notes, status, source, created_at, purchased_at`,
    [requestId, staffDiscordUserId, staffUsername],
  );

  if (result.rows.length === 0) {
    const error = new Error("Book request not found or already purchased.");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

module.exports = {
  TITLE_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  createBookRequest,
  listOpenBookRequests,
  toggleBookRequestUpvote,
  markBookRequestPurchased,
};
