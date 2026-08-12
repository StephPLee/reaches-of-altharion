## Backend routes

- `GET /health`
- `GET /auth/discord/login`
- `GET /auth/discord/callback`
- `POST /auth/logout`
- `GET /api/me`
- `GET /api/calendar`
- `GET /api/sourcebooks`
- `POST /api/admin/calendar`
- `GET /api/admin/sourcebooks`
- `POST /api/admin/sourcebooks`
- `PATCH /api/admin/sourcebooks/:sourcebookId`
- `DELETE /api/admin/sourcebooks/:sourcebookId`

## Required env

- `APP_ORIGIN`
- `SERVER_PORT`
- `COOKIE_SECURE`
- `SESSION_COOKIE_SAME_SITE`
- `DATABASE_SSL_MODE`
- `DATABASE_SSL_REJECT_UNAUTHORIZED`
- `OAUTH_STATE_COOKIE_NAME`
- `OAUTH_STATE_TTL_MINUTES`
- `STAFF_REVALIDATION_MINUTES`
- `SESSION_COOKIE_NAME`
- `SESSION_TTL_DAYS`
- `AUTH_RATE_LIMIT_WINDOW_MS`
- `AUTH_RATE_LIMIT_MAX_REQUESTS`
- `AUTH_CALLBACK_RATE_LIMIT_MAX_REQUESTS`
- `SESSION_RATE_LIMIT_WINDOW_MS`
- `SESSION_RATE_LIMIT_MAX_REQUESTS`
- `ADMIN_RATE_LIMIT_WINDOW_MS`
- `ADMIN_RATE_LIMIT_MAX_REQUESTS`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_TOKEN`
- `DISCORD_GUILD_ID`
- `CALENDAR_ANNOUNCEMENT_CHANNEL_ID` (optional, posts new calendar events to this channel)
- `MARKETPLACE_CHANNEL_ID` (optional, posts scheduled marketplace updates to this channel)
- `MARKETPLACE_MESSAGE_ID` (optional, edits an existing marketplace message instead of creating the first one)
- `PLAYER_ROLE_ID` (optional, pings this role when a scheduled marketplace publishes)
- `REQUIRED_ROLE_ID`
- `DM_ROLE_ID` (optional, for rewards-calculator submit access without staff edit access)
- `DISCORD_OAUTH_REDIRECT_URI`
- `DATABASE_URL`

## Database

Run [sql/001_auth_hardening.sql](C:/Users/Steph/reaches-of-altharion/sql/001_auth_hardening.sql) before using audit logging in non-dev environments.
Run [sql/044_reward_events.sql](C:/Users/Steph/reaches-of-altharion/sql/044_reward_events.sql) before configuring database-driven event currency rules.
Run [sql/045_reward_event_calendar_link.sql](C:/Users/Steph/reaches-of-altharion/sql/045_reward_event_calendar_link.sql) so reward events create and update linked calendar entries.
Run [sql/046_world_wiki.sql](C:/Users/Steph/reaches-of-altharion/sql/046_world_wiki.sql) before using the World Wiki or Timeline features. Uploaded wiki images are stored on disk under `uploads/world-wiki/` (not version controlled) and served at `/uploads/world-wiki/:fileName`.
Run [sql/047_timeline_event_image.sql](C:/Users/Steph/reaches-of-altharion/sql/047_timeline_event_image.sql) to add the optional `image_path` column to `timeline_events`.
Run [sql/048_timeline_chapter_marker.sql](C:/Users/Steph/reaches-of-altharion/sql/048_timeline_chapter_marker.sql) to add the `is_chapter_marker` column to `timeline_events`.
Run [sql/058_capstones_schema.sql](C:/Users/Steph/reaches-of-altharion/sql/058_capstones_schema.sql) and [sql/059_seed_capstones.sql](C:/Users/Steph/reaches-of-altharion/sql/059_seed_capstones.sql) before using the New Capstones homebrew section.
Run [sql/060_discord_message_id_arrays.sql](C:/Users/Steph/reaches-of-altharion/sql/060_discord_message_id_arrays.sql) so starting graces and wiki sections that no longer fit in one Discord message can be posted across several instead of getting truncated.

## Production notes

- Set `COOKIE_SECURE=true`
- Set `SESSION_COOKIE_SAME_SITE=none` for a cross-origin frontend/backend setup
- Set `DATABASE_SSL_MODE=require`
- Set `DATABASE_SSL_REJECT_UNAUTHORIZED=true`
- Register the production `DISCORD_OAUTH_REDIRECT_URI` in the Discord application
- Apply all SQL files in [sql](C:/Users/Steph/reaches-of-altharion/sql)
