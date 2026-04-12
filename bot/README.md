# CC Link Bot Setup

This bot provides `/cc-link`, `/magicitem`, `/approve`, `/join-guild`, `/leave-guild`, and `/post-guild-rosters` in your Discord server.

- `/cc-link` returns a single assigned DnD Beyond campaign link from Postgres.
- `/magicitem` opens a rarity dropdown and rolls a random seeded magic item from Postgres.
- `/approve` lets staff approve a homebrew link into the site-backed homebrew tables.
- `/join-guild` lets players add or move one of their WestMarches.games characters to a guild roster.
- `/leave-guild` lets players remove one of their WestMarches.games characters from its guild roster.
- `/post-guild-rosters` lets staff post or refresh the per-guild roster messages.

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
- `homebrew_entries`
- `homebrew_section_items`
- `magic_items`
- `guild_roster_memberships`
- `guild_roster_messages`

Populate `cc_campaigns` with your `CC1..CC15` links.
Run `sql/016_seed_magic_items.sql` to create and seed the dedicated `magic_items` table.
Run `sql/017_guild_rosters.sql` to create the guild roster tables.
Run `npm run generate:guild-rosters -- "C:\Users\Steph\Downloads\guild rosters.csv"` to generate `sql/018_import_existing_guild_rosters.sql` from the Trello CSV using real WestMarches.games character IDs, then run that SQL file.
Run `sql/019_guild_roster_messages.sql` to create the table that stores the Discord message IDs for per-guild roster posts.

## 3) Environment Variables

Create a `.env` file using `.env.example`:

```env
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_GUILD_ID=...
REQUIRED_ROLE_ID=...
DATABASE_URL=...
WEST_MARCHES_API_KEY=...
WEST_MARCHES_API_BASE_URL=https://www.westmarches.games/api/v1
GUILD_ROSTER_CHANNEL_ID=...
```

`REQUIRED_ROLE_ID` can be blank to allow all members in the guild.
`GUILD_ROSTER_CHANNEL_ID` is optional; if it is blank, the first roster post is created in the channel where `/join-guild` is completed.

## 4) Install and run locally

```bash
npm install
npm run bot:start
```

When the bot starts, it auto-registers `/cc-link`, `/magicitem`, `/approve`, `/join-guild`, `/leave-guild`, and `/post-guild-rosters` in the configured guild.

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
- `/magicitem` shows a rarity select menu and rolls a random published item from the dedicated `magic_items` table.
- `/approve` is gated by `REQUIRED_ROLE_ID`, then prompts for homebrew type. Weapons and wondrous items ask for rarity; spells ask for level; species, feats, and subclasses go straight to a name/URL form.
- `/approve` writes published rows into `homebrew_entries` and `homebrew_section_items`, avoiding duplicates by matching the target section against the submitted URL or label.
- `/join-guild` fetches active characters whose WestMarches.games `user.discordId` matches the Discord user, prompts for a character and guild, stores the roster membership in Postgres, posts a public confirmation, and edits or creates the relevant roster message.
- `/leave-guild` verifies the user's active WestMarches.games characters, removes the selected roster membership, posts a public confirmation, and refreshes the relevant roster message.
- `/post-guild-rosters` posts or refreshes one plain-text Discord message per published guild. Each line is `Character Name <@discord-id>`, with a divider at the end of each guild message. Roster message IDs are stored in `guild_roster_messages`.
