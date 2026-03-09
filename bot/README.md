# CC Link Bot Setup

This bot provides `/cc-link` in your Discord server and returns a single assigned DnD Beyond campaign link from Postgres.

## 1) Discord Developer Portal

1. Open your app -> `Bot` -> create bot user if needed.
2. Copy bot token and store as `DISCORD_TOKEN`.
3. OAuth2 URL Generator:
   - Scopes: `bot`, `applications.commands`
   - Bot permissions: `Send Messages`, `Use Slash Commands`
4. Invite the bot to your server.
5. Copy:
   - Application ID -> `DISCORD_CLIENT_ID`
   - Guild ID (server ID) -> `DISCORD_GUILD_ID`
   - Optional role ID for gating -> `REQUIRED_ROLE_ID`

## 2) Database

Make sure these tables exist:

- `cc_campaigns`
- `cc_assignments`
- `cc_audit_log`

Populate `cc_campaigns` with your `CC1..CC15` links.

## 3) Environment Variables

Create a `.env` file using `.env.example`:

```env
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_GUILD_ID=...
REQUIRED_ROLE_ID=...
DATABASE_URL=...
```

`REQUIRED_ROLE_ID` can be blank to allow all members in the guild.

## 4) Install and run locally

```bash
npm install
npm run bot:start
```

When the bot starts, it auto-registers `/cc-link` in the configured guild.

## 5) Deploy on Railway

1. Create a new service from this repo.
2. Set start command:
   - `npm run bot:start`
3. Add the same environment variables in Railway.
4. Ensure `DATABASE_URL` points to your Railway Postgres.

## Behavior

- First `/cc-link` request from a user: assigns least-used active campaign.
- Later requests from same user: returns same link.
- Writes events into `cc_audit_log`.
