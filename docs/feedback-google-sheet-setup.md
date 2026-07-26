# Feedback Google Sheet setup

The application always saves feedback to PostgreSQL first. Google Sheets is an optional staff-facing mirror; anonymous rows never include the retained Discord ID.

1. Create a Google Sheet and name its first tab `Feedback` (the script will also create it if missing).
2. Open **Extensions → Apps Script**.
3. Replace the editor contents with `scripts/google-feedback-webhook.gs` from this repository.
4. In Apps Script, open **Project Settings → Script properties** and add `WEBHOOK_SECRET` with a long random value (at least 32 characters).
5. Select **Deploy → New deployment → Web app**.
6. Set **Execute as** to yourself and **Who has access** to anyone, then deploy. The shared secret authenticates application requests.
7. Add these variables to both the website/server and bot deployments:

   ```env
   GOOGLE_SHEETS_FEEDBACK_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   GOOGLE_SHEETS_FEEDBACK_WEBHOOK_SECRET=the-same-random-secret
   ```

8. Apply `sql/055_feedback_submissions.sql` to the production database and restart both services. The bot registers `/feedback` at startup.

The sheet columns are **Submission ID**, **Submitted**, **Display name**, **Feedback**, and **Source**. Protect access to the sheet as staff-only. Discord IDs remain in the database's `feedback_submissions.discord_user_id` column.

Optional website rate-limit settings:

```env
FEEDBACK_RATE_LIMIT_WINDOW_MS=600000
FEEDBACK_RATE_LIMIT_MAX_REQUESTS=5
```
