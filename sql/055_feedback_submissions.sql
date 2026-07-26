CREATE TABLE IF NOT EXISTS feedback_submissions (
  id BIGSERIAL PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  submitter_username TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  feedback TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('bot', 'website')),
  google_sheet_synced_at TIMESTAMPTZ,
  google_sheet_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feedback_submissions_feedback_not_blank CHECK (length(btrim(feedback)) > 0),
  CONSTRAINT feedback_submissions_identity_matches_anonymity CHECK (
    (is_anonymous AND submitter_username IS NULL)
    OR (NOT is_anonymous AND submitter_username IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS feedback_submissions_discord_user_created_idx
  ON feedback_submissions (discord_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_submissions_created_idx
  ON feedback_submissions (created_at DESC);
