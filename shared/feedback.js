const FEEDBACK_MAX_LENGTH = 4000;

function normalizeFeedback(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

async function createFeedbackSubmission(pool, { discordUserId, username, anonymous, feedback, source }) {
  const normalizedFeedback = normalizeFeedback(feedback);
  if (!normalizedFeedback) {
    const error = new Error("Feedback is required.");
    error.statusCode = 400;
    throw error;
  }
  if (normalizedFeedback.length > FEEDBACK_MAX_LENGTH) {
    const error = new Error(`Feedback must be ${FEEDBACK_MAX_LENGTH.toLocaleString()} characters or fewer.`);
    error.statusCode = 400;
    throw error;
  }
  if (!["bot", "website"].includes(source)) throw new Error("Invalid feedback source.");

  const result = await pool.query(
    `INSERT INTO feedback_submissions (
       discord_user_id, submitter_username, is_anonymous, feedback, source
     ) VALUES ($1, $2, $3, $4, $5)
     RETURNING id, submitter_username, is_anonymous, feedback, source, created_at`,
    [discordUserId, anonymous ? null : username, Boolean(anonymous), normalizedFeedback, source],
  );
  return result.rows[0];
}

async function syncFeedbackToGoogleSheet(pool, submission, { webhookUrl, webhookSecret }) {
  if (!webhookUrl) return { configured: false, synced: false };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: webhookSecret,
        submissionId: String(submission.id),
        submittedAt: new Date(submission.created_at).toISOString(),
        displayName: submission.is_anonymous ? "Anonymous" : submission.submitter_username,
        feedback: submission.feedback,
        source: submission.source === "bot" ? "Discord" : "Website",
      }),
    });
    const responseBody = await response.text();
    if (!response.ok) throw new Error(`Google Sheets webhook returned ${response.status}.`);
    let payload = {};
    try { payload = JSON.parse(responseBody); } catch { /* Empty response is acceptable. */ }
    if (payload.ok === false) throw new Error(payload.error || "Google Sheets webhook rejected the submission.");

    await pool.query(
      `UPDATE feedback_submissions
       SET google_sheet_synced_at = NOW(), google_sheet_sync_error = NULL
       WHERE id = $1`,
      [submission.id],
    );
    return { configured: true, synced: true };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown sync error";
    await pool.query(
      `UPDATE feedback_submissions SET google_sheet_sync_error = $2 WHERE id = $1`,
      [submission.id, message],
    );
    console.error("Failed to sync feedback to Google Sheets:", error);
    return { configured: true, synced: false };
  }
}

async function submitFeedback(pool, values, googleSheetsConfig) {
  const submission = await createFeedbackSubmission(pool, values);
  const sheetSync = await syncFeedbackToGoogleSheet(pool, submission, googleSheetsConfig);
  return { submission, sheetSync };
}

module.exports = { FEEDBACK_MAX_LENGTH, normalizeFeedback, submitFeedback };
