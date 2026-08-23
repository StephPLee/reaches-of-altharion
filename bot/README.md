# CC Link Bot Setup

This bot provides `/help`, `/faq`, `/characters`, `/sc-character`, `/retire`, `/cc-link`, `/magicitem`, `/approve`, `/approve-character`, `/sync-level-roles`, `/join-guild`, `/leave-guild`, `/post-guild-rosters`, `/rp`, `/sticky`, and manual boss fight commands in your Discord server.

- `/help` lists the bot commands and what they do.
- `/faq` shows the frequently asked questions from Postgres.
- `/characters` lists your WestMarches.games characters, class, and level.
- `/sc-character` lets players choose which character receives automatic SC-only rewards.
- `/retire` lets players choose one of their active WestMarches.games characters, sets its status to `RETIRED` via the WestMarches API, and posts a public retirement announcement.
- `/cc-link` returns a single assigned DnD Beyond campaign link from Postgres.
- `/magicitem` opens a rarity dropdown and rolls a random seeded magic item from Postgres.
- `/approve` lets staff approve a homebrew link or markdown-backed boon/grace into the site-backed homebrew tables.
- `/approve-character` lets DMs or staff approve a WestMarches.games character, assigns the player their Beginner role when needed, and awards the approver 2 SC.
- `/sync-level-roles` lets staff preview every proposed bracket-role change, review a private detailed report, and approve all changes in one batch.
- `/join-guild` lets players add or move one of their WestMarches.games characters to a guild roster.
- `/leave-guild` lets players remove one of their WestMarches.games characters from its guild roster.
- `/post-guild-rosters` lets staff post or refresh the per-guild roster messages.
- `/rp` tracks active roleplay time in the current channel or thread.
- `/sticky set` and `/sticky remove` let staff pin a message that automatically reposts to the bottom of the current channel or thread whenever new messages come in.
- `/boss-start` lets staff start a manual server boss fight.
- `/boss-post` lets staff post a fresh public boss status message.
- `/boss-damage` lets staff record manual damage against the active boss, scaled by quest level.
- `/boss-heal` lets staff restore boss HP for corrections.
- `/boss-status` shows active boss HP privately or publicly.
- `/boss-log` shows recent boss HP changes privately.

## 1) Discord Developer Portal

1. Open your app -> `Bot` -> create bot user if needed.
2. Copy bot token and store as `DISCORD_TOKEN`.
3. OAuth2 URL Generator:
   - Scopes: `bot`, `applications.commands`
   - Bot permissions: `View Channels`, `Read Message History`, `Send Messages`, `Use Slash Commands`
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
- `sc_reward_character_preferences`
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
Run `sql/032_sc_reward_character_preferences.sql` to create the table that stores users' default SC reward characters.
Run `sql/023_event_bosses.sql` to create the manual boss fight tables.
Run `sql/024_rp_sessions.sql` to create the RP timer table.
Run `sql/046_sticky_messages.sql` to create the sticky message table.
Run `sql/060_discord_message_id_arrays.sql` so `/post-discord-content` can post long starting graces or wiki sections across multiple messages instead of truncating them.
Run `sql/061_quest_calls.sql` to create the quest call tables.
Run `sql/062_quest_call_responses_characters.sql` to move quest call responses from level brackets to specific characters.
Run `sql/066_quest_calls_starts_at.sql` so `/quest-check` can schedule a future start time instead of only meaning "right now".

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
WEST_MARCHES_SC_CURRENCY_ID=...
GUILD_ROSTER_CHANNEL_ID=...
BOSS_STATUS_CHANNEL_ID=...
BEGINNER_ROLE_CHANNEL_ID=...
BEGINNER_ROLE_ID=1417172430539063378
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

When the bot starts, it auto-registers `/help`, `/faq`, `/characters`, `/sc-character`, `/retire`, `/cc-link`, `/magicitem`, `/approve`, `/approve-character`, `/sync-level-roles`, `/join-guild`, `/leave-guild`, `/post-guild-rosters`, `/rp`, `/boss-start`, `/boss-post`, `/boss-damage`, `/boss-heal`, `/boss-status`, and `/boss-log` in the configured guild.

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
- `/sc-character` fetches the user's active WestMarches.games characters and stores their chosen default for automatic SC-only rewards.
- `/retire` fetches the user's active WestMarches.games characters, and on selection calls `PATCH /characters/{id}/status` with `{ "status": "RETIRED", "reason": ..., "discordId": ... }` so the change is attributed to the player, then posts a public retirement announcement.
- `/magicitem` shows a rarity select menu and rolls a random published item from the dedicated `magic_items` table.
- `/approve` is gated by `REQUIRED_ROLE_ID`, then prompts for homebrew type. Weapons and wondrous items ask for rarity; spells ask for level; subclasses ask for the parent class; species and feats go straight to a name/URL form. Boons and starting graces use a name/markdown form and are saved directly to their dedicated tables.
- `/approve` writes published rows into `homebrew_entries` and `homebrew_section_items`, avoiding duplicates by matching the target section against the submitted URL or label.
- `/approve-character` is gated by `REQUIRED_ROLE_ID` or `DM_ROLE_ID`. It approves one unapproved active WestMarches.games character for the mentioned user through the API, ensures the player has the configured `BEGINNER_ROLE_ID`, posts the player reminder, and awards 2 SC to the approver's `/sc-character` default if set, otherwise their highest-level active character. If the user has multiple unapproved active characters, add the optional `character` name.
- `/sync-level-roles` is gated by `REQUIRED_ROLE_ID`. It first performs a read-only check of every Discord user linked to a WestMarches.games character and provides an ephemeral summary plus a detailed text attachment. Staff can cancel or approve all proposed changes with one button. Approval re-fetches the character data before applying anything, then returns final totals and a results attachment. Level 20 grants both Master and Paragon.
- `/join-guild` fetches active characters whose WestMarches.games `user.discordId` matches the Discord user, prompts for a character and guild, stores the roster membership in Postgres, posts a public confirmation, and edits or creates the relevant roster message. If the guild has a `discord_role_id` configured, the bot grants that role to the invoking member (including self-healing if they already have a character in that guild but are somehow missing the role). Moving a character to a different guild also removes the old guild's role, unless the member still has another character rostered there.
- `/leave-guild` verifies the user's active WestMarches.games characters, removes the selected roster membership, posts a public confirmation, and refreshes the relevant roster message. If the guild has a `discord_role_id` configured, the bot removes that role from the member unless another of their characters is still rostered in the same guild.
- A guild's Discord role is configured by setting `guilds.discord_role_id` directly in the database (nullable — guilds without one simply skip role sync). The bot needs the **Manage Roles** permission, with its own highest role positioned above any guild role it needs to assign or remove.
- `/post-guild-rosters` posts or refreshes one plain-text Discord message per published guild. Each line is `Character Name <@discord-id>`, with a divider at the end of each guild message. Roster message IDs are stored in `guild_roster_messages`.
- Characters can only join, leave, or change guild once every 7 days after their first bot-driven roster change. Cooldowns persist after leaving, so a character cannot leave and immediately join a different guild. Imported roster rows are not backfilled with a cooldown timestamp, so existing memberships are not blocked immediately.
- `/rp start`, `/rp pause`, `/rp resume`, `/rp end`, and `/rp status` track one open RP timer per channel or thread. The starter or staff can pause, resume, or end it, and each command posts a public update where it was used.
- `/sticky set` posts (or replaces) a sticky message in the current channel or thread and stores it in `sticky_messages`. Whenever a new message appears in a channel with an active sticky, the bot deletes and reposts the sticky a few seconds later so it settles at the bottom, without touching the message that triggered it or interfering with other commands. `/sticky remove` deletes the stored sticky and its posted message.
- `/boss-start` deactivates any previous active boss, creates a new boss at full HP, or creates a count-up progress tracker starting at 0. Use `mode: count-up`; set `target: none` for an infinite target shown as `Progress: value / ∞`.
- `/boss-post` posts a fresh public boss status embed and makes that new message the one refreshed by later boss HP updates.
- `/boss-damage` and `/boss-heal` write entries to `event_boss_damage_log`, update `event_bosses.current_hp`, and refresh the stored public boss status message. `/boss-damage` multiplies the entered damage by quest level: 18-20 = 1x, 14-17 = 3x, 9-13 = 5x, and 4-8 = 10x. For count-up trackers, damage adds progress and healing removes progress for corrections. New damage log entries include the base damage, multiplier, and quest level.
- Boss status embeds use the configured image URL, or the default site asset `/img/events/direbunny.jpg`.
