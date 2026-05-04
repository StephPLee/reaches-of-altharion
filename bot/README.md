# CC Link Bot Setup

This bot provides `/help`, `/faq`, `/characters`, `/cc-link`, `/magicitem`, `/approve`, `/join-guild`, `/leave-guild`, `/post-guild-rosters`, `/rp`, and manual boss fight commands in your Discord server.

- `/help` lists the bot commands and what they do.
- `/faq` shows the frequently asked questions from Postgres.
- `/characters` lists your WestMarches.games characters, class, and level.
- `/cc-link` returns a single assigned DnD Beyond campaign link from Postgres.
- `/magicitem` opens a rarity dropdown and rolls a random seeded magic item from Postgres.
- `/approve` lets staff approve a homebrew link or markdown-backed boon/grace into the site-backed homebrew tables.
- `/join-guild` lets players add or move one of their WestMarches.games characters to a guild roster.
- `/leave-guild` lets players remove one of their WestMarches.games characters from its guild roster.
- `/post-guild-rosters` lets staff post or refresh the per-guild roster messages.
- `/rp` tracks active roleplay time in the current channel or thread.
- `/boss-start` lets staff start a manual server boss fight.
- `/boss-post` lets staff post or refresh the public boss status message.
- `/boss-damage` lets staff record manual damage against the active boss, scaled by quest level.
- `/boss-heal` lets staff restore boss HP for corrections.
- `/boss-status` shows the active boss HP privately.
- `/boss-log` shows recent boss HP changes privately.

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
- `event_bosses`
- `event_boss_damage_log`
- `rp_sessions`

Populate `cc_campaigns` with your `CC1..CC15` links.
Run `sql/016_seed_magic_items.sql` to create and seed the dedicated `magic_items` table.
Run `sql/017_guild_rosters.sql` to create the guild roster tables.
Run `npm run generate:guild-rosters -- "C:\Users\Steph\Downloads\guild rosters.csv"` to generate `sql/018_import_existing_guild_rosters.sql` from the Trello CSV using real WestMarches.games character IDs, then run that SQL file.
Run `sql/019_guild_roster_messages.sql` to create the table that stores the Discord message IDs for per-guild roster posts.
Run `sql/020_guild_roster_cooldowns.sql` to add the weekly guild-change cooldown timestamp.
Run `sql/021_guild_roster_persistent_cooldowns.sql` so cooldowns survive a character leaving their guild.
Run `sql/023_event_bosses.sql` to create the manual boss fight tables.
Run `sql/024_rp_sessions.sql` to create the RP timer table.

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
BOSS_STATUS_CHANNEL_ID=...
PUBLIC_SITE_URL=https://reachesofaltharion.com
```

`REQUIRED_ROLE_ID` can be blank to allow all members in the guild.
`GUILD_ROSTER_CHANNEL_ID` is optional; if it is blank, the first roster post is created in the channel where `/join-guild` is completed.
`BOSS_STATUS_CHANNEL_ID` is optional; if it is blank, the boss status post is created in the channel where `/boss-start` or `/boss-post` is used.
`PUBLIC_SITE_URL` is used for repo-hosted boss images. The default boss image is `/img/events/direbunny.jpg`, which resolves to `${PUBLIC_SITE_URL}/img/events/direbunny.jpg`.

## 4) Install and run locally

```bash
npm install
npm run bot:start
```

When the bot starts, it auto-registers `/help`, `/faq`, `/characters`, `/cc-link`, `/magicitem`, `/approve`, `/join-guild`, `/leave-guild`, `/post-guild-rosters`, `/rp`, `/boss-start`, `/boss-post`, `/boss-damage`, `/boss-heal`, `/boss-status`, and `/boss-log` in the configured guild.

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
- `/help` is generated from the shared command definition list in `bot/commands.js`, so command descriptions stay in one place.
- `/faq` reads the same FAQ entries used by the site, so updating the FAQ through the site editor updates the website and the bot response.
- `/characters` fetches the user's active WestMarches.games characters and shows class and level. Its `visibility` option defaults to private and can be set to public.
- `/magicitem` shows a rarity select menu and rolls a random published item from the dedicated `magic_items` table.
- `/approve` is gated by `REQUIRED_ROLE_ID`, then prompts for homebrew type. Weapons and wondrous items ask for rarity; spells ask for level; subclasses ask for the parent class; species and feats go straight to a name/URL form. Boons and starting graces use a name/markdown form and are saved directly to their dedicated tables.
- `/approve` writes published rows into `homebrew_entries` and `homebrew_section_items`, avoiding duplicates by matching the target section against the submitted URL or label.
- `/join-guild` fetches active characters whose WestMarches.games `user.discordId` matches the Discord user, prompts for a character and guild, stores the roster membership in Postgres, posts a public confirmation, and edits or creates the relevant roster message.
- `/leave-guild` verifies the user's active WestMarches.games characters, removes the selected roster membership, posts a public confirmation, and refreshes the relevant roster message.
- `/post-guild-rosters` posts or refreshes one plain-text Discord message per published guild. Each line is `Character Name <@discord-id>`, with a divider at the end of each guild message. Roster message IDs are stored in `guild_roster_messages`.
- Characters can only join, leave, or change guild once every 7 days after their first bot-driven roster change. Cooldowns persist after leaving, so a character cannot leave and immediately join a different guild. Imported roster rows are not backfilled with a cooldown timestamp, so existing memberships are not blocked immediately.
- `/rp start`, `/rp pause`, `/rp resume`, `/rp end`, and `/rp status` track one open RP timer per channel or thread. The starter or staff can pause, resume, or end it, and each command posts a public update where it was used.
- `/boss-start` deactivates any previous active boss, creates a new boss at full HP, and posts its public status embed.
- `/boss-damage` and `/boss-heal` write entries to `event_boss_damage_log`, update `event_bosses.current_hp`, and refresh the stored public boss status message. `/boss-damage` multiplies the entered damage by quest level: 18-20 = 1x, 14-17 = 3x, 9-13 = 5x, and 4-8 = 10x. New damage log entries include the base damage, multiplier, and quest level.
- Boss status embeds use the configured image URL, or the default site asset `/img/events/direbunny.jpg`.
