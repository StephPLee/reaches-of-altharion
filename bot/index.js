const path = require("path");
const dotenv = require("dotenv");

// Support both project-root .env and bot/.env.
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, ".env") });

const {
  ActionRowBuilder,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  ModalBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { Pool } = require("pg");

const requiredEnv = [
  "DISCORD_TOKEN",
  "DISCORD_CLIENT_ID",
  "DISCORD_GUILD_ID",
  "DATABASE_URL",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  databaseUrl: process.env.DATABASE_URL,
  requiredRoleId: process.env.REQUIRED_ROLE_ID || "",
  guildRosterChannelId: process.env.GUILD_ROSTER_CHANNEL_ID || "",
  bossStatusChannelId: process.env.BOSS_STATUS_CHANNEL_ID || "",
  publicSiteUrl: (
    process.env.PUBLIC_SITE_URL || "https://reachesofaltharion.com"
  ).replace(/\/$/, ""),
  westMarchesApiBaseUrl: (
    process.env.WEST_MARCHES_API_BASE_URL ||
    "https://www.westmarches.games/api/v1"
  ).replace(/\/$/, ""),
  westMarchesApiKey: process.env.WEST_MARCHES_API_KEY || "",
};

const GUILD_ROSTER_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const COMMAND_DEFINITIONS = [
  {
    name: "help",
    description: "List the bot commands and what they do.",
    help: "List the bot commands and what they do.",
  },
  {
    name: "cc-link",
    description: "Get your assigned character creation campaign link.",
    help: "Get your assigned D&D Beyond character creation campaign link.",
    requiresRole: true,
  },
  {
    name: "magicitem",
    description: "Roll a random magic item from a selected rarity.",
    help: "Open a rarity dropdown and roll a random magic item.",
  },
  {
    name: "characters",
    description: "List your WestMarches.games characters.",
    help: "List your WestMarches.games characters with their class and level. Use the visibility option to share it publicly.",
    buildCommand: (command) =>
      command.addStringOption((option) =>
        option
          .setName("visibility")
          .setDescription("Who should see the character list?")
          .addChoices(
            { name: "Private", value: "private" },
            { name: "Public", value: "public" },
          ),
      ),
  },
  {
    name: "approve",
    description: "Approve a homebrew link for the site.",
    help: "Staff-only. Approve a homebrew link into the site-backed homebrew lists.",
    requiresRole: true,
  },
  {
    name: "join-guild",
    description: "Join or move one of your characters to a guild.",
    help: "Choose one of your WestMarches.games characters and add or move them to a guild roster.",
  },
  {
    name: "leave-guild",
    description: "Remove one of your characters from their guild roster.",
    help: "Remove one of your WestMarches.games characters from their current guild roster.",
  },
  {
    name: "post-guild-rosters",
    description: "Post or refresh the guild roster messages.",
    help: "Staff-only. Post or refresh the per-guild roster messages in Discord.",
    requiresRole: true,
  },
  {
    name: "boss-start",
    description: "Start a manual server boss fight.",
    help: "Staff-only. Start a manual server boss fight with a name and maximum HP.",
    requiresRole: true,
    buildCommand: (command) =>
      command
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("The boss name.")
            .setRequired(true)
            .setMaxLength(100),
        )
        .addIntegerOption((option) =>
          option
            .setName("max-hp")
            .setDescription("The boss maximum HP.")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(Number.MAX_SAFE_INTEGER),
        )
        .addStringOption((option) =>
          option
            .setName("image-url")
            .setDescription("Optional public image URL for the boss embed.")
            .setMaxLength(500),
        ),
  },
  {
    name: "boss-post",
    description: "Post or refresh the active boss status message.",
    help: "Staff-only. Post or refresh the public active boss status message.",
    requiresRole: true,
  },
  {
    name: "boss-damage",
    description: "Record manual damage against the active boss.",
    help: "Staff-only. Record manual damage against the active boss.",
    requiresRole: true,
    buildCommand: (command) =>
      command
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Damage dealt.")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(Number.MAX_SAFE_INTEGER),
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Optional note for the damage log.")
            .setMaxLength(500),
        ),
  },
  {
    name: "boss-heal",
    description: "Restore HP to the active boss for corrections.",
    help: "Staff-only. Restore HP to the active boss for corrections.",
    requiresRole: true,
    buildCommand: (command) =>
      command
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("HP to restore.")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(Number.MAX_SAFE_INTEGER),
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Optional note for the healing log.")
            .setMaxLength(500),
        ),
  },
  {
    name: "boss-status",
    description: "Show the active boss status.",
    help: "Show the active boss status.",
  },
  {
    name: "boss-log",
    description: "Show recent active boss damage entries.",
    help: "Show recent active boss damage entries.",
  },
  {
    name: "faq",
    description: "Show the frequently asked questions.",
    help: "Show the frequently asked questions.",
  },
  {
    name: "faq-add",
    description: "Add or update a frequently asked question.",
    help: "Staff-only. Add or update a FAQ entry without redeploying the bot.",
    requiresRole: true,
  },
];

const commands = COMMAND_DEFINITIONS.map((definition) => {
  const command = new SlashCommandBuilder()
    .setName(definition.name)
    .setDescription(definition.description);

  return (definition.buildCommand
    ? definition.buildCommand(command)
    : command
  ).toJSON();
});

const MAGIC_ITEM_RARITIES = [
  {
    value: "common",
    label: "Common",
    description: "Roll a random common magic item.",
  },
  {
    value: "uncommon",
    label: "Uncommon",
    description: "Roll a random uncommon magic item.",
  },
  {
    value: "rare",
    label: "Rare",
    description: "Roll a random rare magic item.",
  },
  {
    value: "veryrare",
    label: "Very Rare",
    description: "Roll a random very rare magic item.",
  },
  {
    value: "legendary",
    label: "Legendary",
    description: "Roll a random legendary magic item.",
  },
];

const MAGIC_ITEM_RESULT_GIF_URL =
  "https://cdn.discordapp.com/attachments/1088129532214644776/1465689802887401607/rashaken-idleon.gif";

const APPROVE_CATEGORIES = [
  {
    value: "weapons",
    label: "Weapons",
    description: "Approve a homebrew weapon.",
  },
  {
    value: "wondrous-items",
    label: "Wondrous Items",
    description: "Approve a homebrew wondrous item.",
  },
  {
    value: "species",
    label: "Species",
    description: "Approve a homebrew species.",
  },
  {
    value: "feats",
    label: "Feats",
    description: "Approve a homebrew feat.",
  },
  {
    value: "subclasses",
    label: "Subclasses",
    description: "Approve a homebrew subclass.",
  },
  {
    value: "spells",
    label: "Spells",
    description: "Approve a homebrew spell.",
  },
];

const APPROVE_RARITIES = [
  { value: "common", label: "Common", sortOrder: 10 },
  { value: "uncommon", label: "Uncommon", sortOrder: 20 },
  { value: "rare", label: "Rare", sortOrder: 30 },
  { value: "very-rare", label: "Very Rare", sortOrder: 40 },
  { value: "legendary", label: "Legendary", sortOrder: 50 },
  { value: "artifact", label: "Artifact", sortOrder: 60 },
];

const APPROVE_WONDROUS_RARITIES = [
  ...APPROVE_RARITIES,
  { value: "varies", label: "Varies", sortOrder: 70 },
];

const APPROVE_SPELL_LEVELS = [
  {
    value: "cantrip",
    label: "Cantrip",
    title: "Cantrips",
    slug: "spell-cantrips",
    sortOrder: 10,
  },
  { value: "1st", label: "1st Level", title: "1st Level Spells", sortOrder: 20 },
  { value: "2nd", label: "2nd Level", title: "2nd Level Spells", sortOrder: 30 },
  { value: "3rd", label: "3rd Level", title: "3rd Level Spells", sortOrder: 40 },
  { value: "4th", label: "4th Level", title: "4th Level Spells", sortOrder: 50 },
  { value: "5th", label: "5th Level", title: "5th Level Spells", sortOrder: 60 },
  { value: "6th", label: "6th Level", title: "6th Level Spells", sortOrder: 70 },
  { value: "7th", label: "7th Level", title: "7th Level Spells", sortOrder: 80 },
  { value: "8th", label: "8th Level", title: "8th Level Spells", sortOrder: 90 },
  { value: "9th", label: "9th Level", title: "9th Level Spells", sortOrder: 100 },
];

async function registerGuildCommands() {
  const rest = new REST({ version: "10" }).setToken(config.token);
  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commands },
  );
  console.log(
    `Slash commands registered: ${COMMAND_DEFINITIONS.map((command) => `/${command.name}`).join(", ")}`,
  );
}

function hasRequiredRole(interaction) {
  if (!config.requiredRoleId) {
    return true;
  }

  const roleIds = interaction.member?.roles;
  if (!roleIds) {
    return false;
  }

  if (Array.isArray(roleIds)) {
    return roleIds.includes(config.requiredRoleId);
  }

  if (roleIds.cache) {
    return roleIds.cache.has(config.requiredRoleId);
  }

  return false;
}

function buildHelpMessage(interaction) {
  const canUseRoleCommands = hasRequiredRole(interaction);
  return COMMAND_DEFINITIONS.filter(
    (command) => !command.requiresRole || canUseRoleCommands,
  ).map(
    (command) => `/${command.name} - ${command.help}`,
  ).join("\n");
}

async function getOrAssignCampaign(discordUserId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `
      SELECT c.code, c.invite_url
      FROM cc_assignments a
      JOIN cc_campaigns c ON c.id = a.campaign_id
      WHERE a.discord_user_id = $1
      LIMIT 1
      `,
      [discordUserId],
    );

    if (existing.rows.length > 0) {
      await client.query(
        `
        UPDATE cc_assignments
        SET last_requested_at = NOW()
        WHERE discord_user_id = $1
        `,
        [discordUserId],
      );
      await client.query(
        `
        INSERT INTO cc_audit_log (discord_user_id, action, metadata)
        VALUES ($1, 'reissued', '{}'::jsonb)
        `,
        [discordUserId],
      );
      await client.query("COMMIT");
      return existing.rows[0];
    }

    const assignment = await client.query(
      `
      WITH pick AS (
        SELECT c.id
        FROM cc_campaigns c
        LEFT JOIN cc_assignments a ON a.campaign_id = c.id
        WHERE c.active = true
        GROUP BY c.id
        ORDER BY COUNT(a.discord_user_id) ASC, c.id ASC
        LIMIT 1
      ),
      inserted AS (
        INSERT INTO cc_assignments (discord_user_id, campaign_id)
        SELECT $1, pick.id
        FROM pick
        RETURNING campaign_id
      )
      SELECT c.code, c.invite_url, c.id AS campaign_id
      FROM inserted i
      JOIN cc_campaigns c ON c.id = i.campaign_id
      `,
      [discordUserId],
    );

    if (assignment.rows.length === 0) {
      await client.query(
        `
        INSERT INTO cc_audit_log (discord_user_id, action, metadata)
        VALUES ($1, 'denied', '{"reason":"no_active_campaigns"}'::jsonb)
        `,
        [discordUserId],
      );
      await client.query("COMMIT");
      return null;
    }

    const picked = assignment.rows[0];
    await client.query(
      `
      INSERT INTO cc_audit_log (discord_user_id, action, campaign_id, metadata)
      VALUES ($1, 'issued', $2, '{}'::jsonb)
      `,
      [discordUserId, picked.campaign_id],
    );

    await client.query("COMMIT");
    return picked;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function truncateValue(value, maxLength) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
}

function formatBossHp(value) {
  return BigInt(value).toLocaleString("en-US");
}

function normalizeBossImageUrl(imageUrl) {
  const trimmed = typeof imageUrl === "string" ? imageUrl.trim() : "";
  const defaultPath = "/img/events/direbunny.jpg";
  const value = trimmed || defaultPath;

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const pathPart = value.startsWith("/") ? value : `/${value}`;
  return `${config.publicSiteUrl}${pathPart}`;
}

function mapBossRow(row) {
  return row
    ? {
        id: Number(row.id),
        name: row.name,
        maxHp: BigInt(row.max_hp),
        currentHp: BigInt(row.current_hp),
        imageUrl: row.image_url,
        statusChannelId: row.status_channel_id,
        statusMessageId: row.status_message_id,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    : null;
}

function buildBossHpBar(currentHp, maxHp, width = 20) {
  const safeMaxHp = maxHp > 0n ? maxHp : 1n;
  const clampedCurrentHp =
    currentHp < 0n ? 0n : currentHp > safeMaxHp ? safeMaxHp : currentHp;
  const filled = Number((clampedCurrentHp * BigInt(width)) / safeMaxHp);
  const empty = width - filled;

  return `[ ${"█".repeat(filled)}${"-".repeat(empty)} ] ${formatBossHp(clampedCurrentHp)}/${formatBossHp(safeMaxHp)}`;
}

function buildBossStatusEmbed(boss) {
  const damageDealt = boss.maxHp - boss.currentHp;
  const progressPercent = Number((damageDealt * 10000n) / boss.maxHp) / 100;

  return new EmbedBuilder()
    .setTitle(boss.name)
    .setDescription(
      [
        buildBossHpBar(boss.currentHp, boss.maxHp),
        "",
        `Damage dealt: ${formatBossHp(damageDealt)} (${progressPercent.toFixed(2)}%)`,
        boss.currentHp === 0n ? "The boss has been defeated." : "The fight continues.",
      ].join("\n"),
    )
    .setImage(normalizeBossImageUrl(boss.imageUrl))
    .setColor(boss.currentHp === 0n ? 0x4caf50 : 0xb73a3a)
    .setTimestamp(new Date(boss.updatedAt || Date.now()));
}

function buildBossLogEmbed(boss, entries) {
  const lines = entries.map((entry) => {
    const sign = entry.entryType === "heal" ? "+" : "-";
    const reason = entry.reason ? ` - ${truncateValue(entry.reason, 160)}` : "";
    return `<t:${Math.floor(new Date(entry.createdAt).getTime() / 1000)}:R> ${sign}${formatBossHp(entry.amount)} by <@${entry.discordUserId}>${reason}`;
  });

  return new EmbedBuilder()
    .setTitle(`${boss.name} Log`)
    .setDescription(lines.length ? lines.join("\n") : "No entries recorded yet.")
    .setColor(0xb73a3a);
}

async function getActiveBoss(client = pool, { lock = false } = {}) {
  const result = await client.query(
    `
    SELECT
      id,
      name,
      max_hp,
      current_hp,
      image_url,
      status_channel_id,
      status_message_id,
      is_active,
      created_at,
      updated_at
    FROM event_bosses
    WHERE is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1
    ${lock ? "FOR UPDATE" : ""}
    `,
  );

  return mapBossRow(result.rows[0]);
}

async function startBossFight({ name, maxHp, imageUrl }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
      UPDATE event_bosses
      SET is_active = FALSE, updated_at = NOW()
      WHERE is_active = TRUE
      `,
    );

    const result = await client.query(
      `
      INSERT INTO event_bosses (name, max_hp, current_hp, image_url)
      VALUES ($1, $2, $2, $3)
      RETURNING
        id,
        name,
        max_hp,
        current_hp,
        image_url,
        status_channel_id,
        status_message_id,
        is_active,
        created_at,
        updated_at
      `,
      [name, maxHp.toString(), imageUrl || null],
    );

    await client.query("COMMIT");
    return mapBossRow(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function recordBossHpEntry({ discordUserId, amount, entryType, reason }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const boss = await getActiveBoss(client, { lock: true });
    if (!boss) {
      await client.query("ROLLBACK");
      return null;
    }

    const nextHp =
      entryType === "heal"
        ? boss.currentHp + amount > boss.maxHp
          ? boss.maxHp
          : boss.currentHp + amount
        : boss.currentHp - amount < 0n
          ? 0n
          : boss.currentHp - amount;

    const result = await client.query(
      `
      UPDATE event_bosses
      SET current_hp = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        name,
        max_hp,
        current_hp,
        image_url,
        status_channel_id,
        status_message_id,
        is_active,
        created_at,
        updated_at
      `,
      [boss.id, nextHp.toString()],
    );

    await client.query(
      `
      INSERT INTO event_boss_damage_log (
        boss_id,
        discord_user_id,
        amount,
        entry_type,
        reason
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        boss.id,
        discordUserId,
        amount.toString(),
        entryType,
        reason?.trim() || null,
      ],
    );

    await client.query("COMMIT");
    return mapBossRow(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function listBossLogEntries(bossId, limit = 10) {
  const result = await pool.query(
    `
    SELECT discord_user_id, amount, entry_type, reason, created_at
    FROM event_boss_damage_log
    WHERE boss_id = $1
    ORDER BY created_at DESC, id DESC
    LIMIT $2
    `,
    [bossId, limit],
  );

  return result.rows.map((row) => ({
    discordUserId: row.discord_user_id,
    amount: BigInt(row.amount),
    entryType: row.entry_type,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

async function postOrRefreshBossStatus(interaction, boss) {
  const embed = buildBossStatusEmbed(boss);
  const targetChannelId =
    boss.statusChannelId || config.bossStatusChannelId || interaction.channelId;
  const targetChannel = await interaction.client.channels.fetch(targetChannelId);

  if (!targetChannel?.send || !targetChannel.messages) {
    throw new Error("Boss status channel is not a text channel.");
  }

  if (boss.statusMessageId) {
    try {
      const message = await targetChannel.messages.fetch(boss.statusMessageId);
      await message.edit({ embeds: [embed] });
      return { channelId: targetChannelId, messageId: message.id, created: false };
    } catch (error) {
      console.error("Failed to edit boss status message; creating a new one:", error);
    }
  }

  const message = await targetChannel.send({ embeds: [embed] });
  await pool.query(
    `
    UPDATE event_bosses
    SET status_channel_id = $2, status_message_id = $3, updated_at = NOW()
    WHERE id = $1
    `,
    [boss.id, targetChannelId, message.id],
  );

  return { channelId: targetChannelId, messageId: message.id, created: true };
}

async function listFaqEntries() {
  const result = await pool.query(
    `
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      c.description AS category_description,
      c.sort_order AS category_sort_order,
      e.id AS entry_id,
      e.question,
      e.answer,
      e.sort_order AS entry_sort_order
    FROM faq_categories c
    LEFT JOIN faq_entries e
      ON e.category_id = c.id
      AND e.is_published = true
    ORDER BY
      c.sort_order ASC,
      LOWER(c.name) ASC,
      e.sort_order ASC NULLS LAST,
      e.id ASC NULLS LAST
    `,
  );

  const categories = new Map();
  for (const row of result.rows) {
    const categoryId = Number(row.category_id);
    if (!categories.has(categoryId)) {
      categories.set(categoryId, {
        id: categoryId,
        name: row.category_name,
        description: row.category_description || "",
        entries: [],
      });
    }

    if (row.entry_id) {
      categories.get(categoryId).entries.push({
        id: Number(row.entry_id),
        question: row.question,
        answer: row.answer,
      });
    }
  }

  return [...categories.values()];
}

function buildFaqEmbeds(categories) {
  if (categories.length === 0) {
    return [
      new EmbedBuilder()
        .setTitle("Frequently Asked Questions")
        .setDescription("No FAQ entries have been added yet."),
    ];
  }

  const embeds = [
    new EmbedBuilder()
      .setTitle("Frequently Asked Questions")
      .setDescription(
        'This should be your first port of call to check for answers to questions you have. It will be updated as more questions become "frequent".',
      ),
  ];

  for (const category of categories) {
    const embed = new EmbedBuilder().setTitle(category.name);
    if (category.description) {
      embed.setDescription(truncateValue(category.description, 4096));
    }

    for (const entry of category.entries) {
      embed.addFields({
        name: truncateValue(entry.question, 256),
        value: truncateValue(entry.answer, 1024),
      });
    }

    if (!category.description && category.entries.length === 0) {
      embed.setDescription("No entries yet.");
    }

    embeds.push(embed);
  }

  return embeds.slice(0, 10);
}

function buildFaqAddModal(discordUserId) {
  const modal = new ModalBuilder()
    .setCustomId(`faq-add-modal:${discordUserId}`)
    .setTitle("Add FAQ Entry");

  const categoryInput = new TextInputBuilder()
    .setCustomId("faq-category")
    .setLabel("Category")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const questionInput = new TextInputBuilder()
    .setCustomId("faq-question")
    .setLabel("Question")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(200);

  const answerInput = new TextInputBuilder()
    .setCustomId("faq-answer")
    .setLabel("Answer")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(4000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(categoryInput),
    new ActionRowBuilder().addComponents(questionInput),
    new ActionRowBuilder().addComponents(answerInput),
  );

  return modal;
}

async function upsertFaqEntry({ categoryName, question, answer }) {
  const normalizedCategoryName = categoryName.trim();
  const normalizedQuestion = question.trim();
  const normalizedAnswer = answer.trim();

  const result = await pool.query(
    `
    WITH category_row AS (
      INSERT INTO faq_categories (name, sort_order)
      VALUES (
        $1,
        COALESCE((SELECT MAX(sort_order) + 10 FROM faq_categories), 10)
      )
      ON CONFLICT (name) DO UPDATE
      SET updated_at = NOW()
      RETURNING id, name
    ),
    entry_row AS (
      INSERT INTO faq_entries (
        category_id,
        question,
        answer,
        sort_order,
        is_published
      )
      SELECT
        category_row.id,
        $2,
        $3,
        COALESCE(
          (
            SELECT MAX(sort_order) + 10
            FROM faq_entries
            WHERE category_id = category_row.id
          ),
          10
        ),
        true
      FROM category_row
      ON CONFLICT (category_id, question) DO UPDATE
      SET
        answer = EXCLUDED.answer,
        is_published = true,
        updated_at = NOW()
      RETURNING id, question, answer, category_id
    )
    SELECT
      entry_row.id,
      entry_row.question,
      entry_row.answer,
      category_row.name AS category_name
    FROM entry_row
    JOIN category_row ON category_row.id = entry_row.category_id
    `,
    [normalizedCategoryName, normalizedQuestion, normalizedAnswer],
  );

  return result.rows[0];
}

function isWestMarchesConfigured() {
  return Boolean(config.westMarchesApiBaseUrl && config.westMarchesApiKey);
}

async function westMarchesFetch(path, init = {}) {
  if (!isWestMarchesConfigured()) {
    throw new Error("West Marches API is not configured.");
  }

  const response = await fetch(`${config.westMarchesApiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.westMarchesApiKey}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error =
      typeof payload?.error === "string" && payload.error
        ? payload.error
        : `West Marches request failed (${response.status}).`;
    const requestError = new Error(error);
    requestError.status = response.status;
    requestError.payload = payload;
    throw requestError;
  }

  return payload;
}

async function listAllWestMarchesCharacters() {
  const pageSize = 500;
  let page = 1;
  let totalPages = 1;
  const characters = [];

  while (page <= totalPages) {
    const payload = await westMarchesFetch(
      `/characters?page=${page}&pageSize=${pageSize}`,
    );
    const nextCharacters = Array.isArray(payload.data) ? payload.data : [];
    characters.push(...nextCharacters);

    totalPages =
      typeof payload?.pagination?.totalPages === "number" &&
      payload.pagination.totalPages > 0
        ? payload.pagination.totalPages
        : 1;
    page += 1;
  }

  return characters;
}

function isActiveWestMarchesCharacter(character) {
  const normalizedStatus =
    typeof character?.status === "string"
      ? character.status.trim().toUpperCase()
      : "";

  return (
    normalizedStatus !== "RETIRED" &&
    normalizedStatus !== "DELETED" &&
    normalizedStatus !== "ARCHIVED"
  );
}

function formatCharacterName(character) {
  return typeof character?.name === "string" ? character.name.trim() : "";
}

async function listOwnedActiveWestMarchesCharacters(discordUserId) {
  const characters = await listAllWestMarchesCharacters();
  return characters
    .filter(
      (character) =>
        isActiveWestMarchesCharacter(character) &&
        character?.user?.discordId === discordUserId &&
        typeof character?.id === "string" &&
        formatCharacterName(character),
    )
    .sort((left, right) =>
      formatCharacterName(left).localeCompare(formatCharacterName(right), undefined, {
        sensitivity: "base",
      }),
    );
}

async function getOwnedActiveWestMarchesCharacter(discordUserId, characterId) {
  const characters = await listOwnedActiveWestMarchesCharacters(discordUserId);
  return characters.find((character) => character.id === characterId) || null;
}

async function getWestMarchesCharacter(characterId) {
  const payload = await westMarchesFetch(`/characters/${characterId}`);
  return payload.data ?? null;
}

function formatCharacterClass(character) {
  if (typeof character?.class === "string" && character.class.trim()) {
    return character.class.trim();
  }

  const attributeValues = Array.isArray(character?.attributeValues)
    ? character.attributeValues
    : [];

  for (const attributeValue of attributeValues) {
    const attributeName =
      typeof attributeValue?.attribute?.name === "string"
        ? attributeValue.attribute.name.trim().toLowerCase()
        : "";

    if (!["class", "classes"].includes(attributeName)) {
      continue;
    }

    const valueTexts = Array.isArray(attributeValue?.valueTexts)
      ? attributeValue.valueTexts
      : [];
    const classText = valueTexts
      .map((value) => (typeof value === "string" ? value.trim() : String(value || "")))
      .filter(Boolean)
      .join(", ");

    if (classText) {
      return classText;
    }
  }

  return "Unknown class";
}

async function listOwnedCharacterSummaries(discordUserId) {
  const characters = await listOwnedActiveWestMarchesCharacters(discordUserId);
  const details = await Promise.all(
    characters.map(async (character) => {
      try {
        return (await getWestMarchesCharacter(character.id)) || character;
      } catch (error) {
        console.error(
          `Failed to load WestMarches character details for ${character.id}:`,
          error,
        );
        return character;
      }
    }),
  );

  return details.map((character, index) => {
    const fallbackCharacter = characters[index];
    return {
      id: character?.id || fallbackCharacter.id,
      name: formatCharacterName(character) || formatCharacterName(fallbackCharacter),
      className: formatCharacterClass(character),
      level:
        character?.level ?? fallbackCharacter?.level ?? "Unknown level",
    };
  });
}

function buildCharacterListEmbed({ displayName, characters }) {
  const description = characters.length
    ? characters
        .map(
          (character) =>
            `**${character.name}** - ${character.className} - Level ${character.level}`,
        )
        .join("\n")
    : "No active WestMarches.games characters were found for this Discord account.";

  return new EmbedBuilder()
    .setTitle(`${displayName}'s Characters`)
    .setDescription(truncateValue(description, 4096));
}

async function listPublishedGuilds() {
  const result = await pool.query(
    `
    SELECT id, name, slug, sort_order
    FROM guilds
    WHERE is_published = true
    ORDER BY sort_order ASC, LOWER(name) ASC, id ASC
    `,
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order,
  }));
}

function mapGuildRosterMembership(row) {
  return row
    ? {
        id: Number(row.id),
        guildId: Number(row.guild_id),
        guildName: row.guild_name,
        westMarchesCharacterId: row.westmarches_character_id,
        characterName: row.character_name,
        discordUserId: row.discord_user_id,
        lastMembershipChangeAt: row.last_membership_change_at,
      }
    : null;
}

function getGuildRosterCooldownUntil(membership) {
  return getCooldownUntilFromTimestamp(membership?.lastMembershipChangeAt);
}

function formatDiscordTimestamp(milliseconds) {
  return `<t:${Math.ceil(milliseconds / 1000)}:R>`;
}

function getCooldownUntilFromTimestamp(timestamp) {
  if (!timestamp) {
    return null;
  }

  const lastChangedAt = new Date(timestamp).getTime();
  if (Number.isNaN(lastChangedAt)) {
    return null;
  }

  const unlocksAt = lastChangedAt + GUILD_ROSTER_CHANGE_COOLDOWN_MS;
  return unlocksAt > Date.now() ? unlocksAt : null;
}

async function getGuildRosterCharacterCooldown(
  client,
  {
    characterId,
    characterName,
    discordUserId,
  },
) {
  const result = await client.query(
    `
    SELECT last_membership_change_at
    FROM guild_roster_character_cooldowns
    WHERE westmarches_character_id = $1
      OR (
        discord_user_id = $2
        AND LOWER(character_name) = LOWER($3)
      )
    ORDER BY
      CASE WHEN westmarches_character_id = $1 THEN 0 ELSE 1 END,
      updated_at DESC
    LIMIT 1
    `,
    [characterId, discordUserId, characterName],
  );

  return getCooldownUntilFromTimestamp(result.rows[0]?.last_membership_change_at);
}

async function recordGuildRosterCharacterCooldown(
  client,
  {
    characterId,
    characterName,
    discordUserId,
  },
) {
  await client.query(
    `
    INSERT INTO guild_roster_character_cooldowns (
      westmarches_character_id,
      character_name,
      discord_user_id,
      last_membership_change_at
    )
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (westmarches_character_id) DO UPDATE
    SET
      character_name = EXCLUDED.character_name,
      discord_user_id = EXCLUDED.discord_user_id,
      last_membership_change_at = NOW(),
      updated_at = NOW()
    `,
    [characterId, characterName, discordUserId],
  );
}

async function getGuildRosterMembership({
  characterId,
  characterName,
  discordUserId,
}) {
  const result = await pool.query(
    `
    SELECT
      m.id,
      m.guild_id,
      g.name AS guild_name,
      m.westmarches_character_id,
      m.character_name,
      m.discord_user_id,
      m.last_membership_change_at
    FROM guild_roster_memberships m
    JOIN guilds g ON g.id = m.guild_id
    WHERE m.westmarches_character_id = $1
      OR (
        m.discord_user_id = $2
        AND LOWER(m.character_name) = LOWER($3)
      )
    ORDER BY
      CASE WHEN m.westmarches_character_id = $1 THEN 0 ELSE 1 END,
      m.id ASC
    LIMIT 1
    `,
    [characterId, discordUserId, characterName],
  );

  return mapGuildRosterMembership(result.rows[0]);
}

async function listGuildRosterMembershipsForDiscordUser(discordUserId) {
  const result = await pool.query(
    `
    SELECT
      m.id,
      m.guild_id,
      g.name AS guild_name,
      m.westmarches_character_id,
      m.character_name,
      m.discord_user_id,
      m.last_membership_change_at
    FROM guild_roster_memberships m
    JOIN guilds g ON g.id = m.guild_id
    WHERE m.discord_user_id = $1
    ORDER BY LOWER(m.character_name) ASC, m.id ASC
    `,
    [discordUserId],
  );

  return result.rows.map(mapGuildRosterMembership);
}

async function deleteGuildRosterMembership({
  characterId,
  characterName,
  discordUserId,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      `
      SELECT
        m.id,
        m.guild_id,
        g.name AS guild_name,
        m.westmarches_character_id,
        m.character_name,
        m.discord_user_id,
        m.last_membership_change_at
      FROM guild_roster_memberships m
      JOIN guilds g ON g.id = m.guild_id
      WHERE m.discord_user_id = $2
        AND (
          m.westmarches_character_id = $1
          OR LOWER(m.character_name) = LOWER($3)
        )
      ORDER BY
        CASE WHEN m.westmarches_character_id = $1 THEN 0 ELSE 1 END,
        m.id ASC
      LIMIT 1
      `,
      [characterId, discordUserId, characterName],
    );
    const membership = mapGuildRosterMembership(existingResult.rows[0]);
    const cooldownUntil = getGuildRosterCooldownUntil(membership);

    if (!membership || cooldownUntil) {
      await client.query("ROLLBACK");
      return {
        membership,
        cooldownUntil,
      };
    }

    const deleteResult = await client.query(
      `
      DELETE FROM guild_roster_memberships
      WHERE id = $1
      RETURNING
        id,
        guild_id,
        westmarches_character_id,
        character_name,
        discord_user_id,
        last_membership_change_at
      `,
      [membership.id],
    );

    await recordGuildRosterCharacterCooldown(client, {
      characterId,
      characterName,
      discordUserId,
    });

    await client.query("COMMIT");

    return {
      membership: mapGuildRosterMembership({
        ...deleteResult.rows[0],
        guild_name: membership.guildName,
      }),
      cooldownUntil: null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function upsertGuildRosterMembership({
  guildId,
  characterId,
  characterName,
  discordUserId,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const guildResult = await client.query(
      `
      SELECT id, name
      FROM guilds
      WHERE id = $1
        AND is_published = true
      LIMIT 1
      `,
      [guildId],
    );
    const guild = guildResult.rows[0];

    if (!guild) {
      await client.query("ROLLBACK");
      return null;
    }

    const existingResult = await client.query(
      `
      SELECT
        m.id,
        m.guild_id,
        g.name AS guild_name,
        m.westmarches_character_id,
        m.character_name,
        m.discord_user_id,
        m.last_membership_change_at
      FROM guild_roster_memberships m
      JOIN guilds g ON g.id = m.guild_id
      WHERE m.westmarches_character_id = $1
        OR (
          m.discord_user_id = $2
          AND LOWER(m.character_name) = LOWER($3)
        )
      ORDER BY
        CASE WHEN m.westmarches_character_id = $1 THEN 0 ELSE 1 END,
        m.id ASC
      LIMIT 1
      `,
      [characterId, discordUserId, characterName],
    );
    const previousMembership = mapGuildRosterMembership(existingResult.rows[0]);
    const cooldownUntil =
      getGuildRosterCooldownUntil(previousMembership) ||
      (await getGuildRosterCharacterCooldown(client, {
        characterId,
        characterName,
        discordUserId,
      }));
    if (cooldownUntil) {
      await client.query("ROLLBACK");
      return {
        membership: previousMembership,
        previousMembership,
        cooldownUntil,
      };
    }

    if (previousMembership?.guildId === guildId) {
      await client.query("ROLLBACK");
      return {
        membership: previousMembership,
        previousMembership,
        cooldownUntil: null,
      };
    }

    const membershipResult = previousMembership
      ? await client.query(
          `
          UPDATE guild_roster_memberships
          SET
            guild_id = $2,
            westmarches_character_id = $3,
            character_name = $4,
            discord_user_id = $5,
            last_membership_change_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
          RETURNING
            id,
            guild_id,
            westmarches_character_id,
            character_name,
            discord_user_id,
            last_membership_change_at
          `,
          [
            previousMembership.id,
            guildId,
            characterId,
            characterName,
            discordUserId,
          ],
        )
      : await client.query(
          `
          INSERT INTO guild_roster_memberships (
            guild_id,
            westmarches_character_id,
            character_name,
            discord_user_id
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (westmarches_character_id) DO UPDATE
          SET
            guild_id = EXCLUDED.guild_id,
            character_name = EXCLUDED.character_name,
            discord_user_id = EXCLUDED.discord_user_id,
            last_membership_change_at = NOW(),
            updated_at = NOW()
          RETURNING
            id,
            guild_id,
            westmarches_character_id,
            character_name,
            discord_user_id,
            last_membership_change_at
          `,
          [guildId, characterId, characterName, discordUserId],
        );

    await recordGuildRosterCharacterCooldown(client, {
      characterId,
      characterName,
      discordUserId,
    });

    await client.query("COMMIT");

    return {
      membership: {
        ...mapGuildRosterMembership({
          ...membershipResult.rows[0],
          guild_name: guild.name,
        }),
      },
      previousMembership,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function listGuildRosterRows() {
  const result = await pool.query(
    `
    SELECT
      g.id AS guild_id,
      g.name AS guild_name,
      g.sort_order,
      m.character_name,
      m.discord_user_id
    FROM guilds g
    LEFT JOIN guild_roster_memberships m ON m.guild_id = g.id
    WHERE g.is_published = true
    ORDER BY g.sort_order ASC, LOWER(g.name) ASC, LOWER(m.character_name) ASC NULLS LAST
    `,
  );

  const guilds = new Map();
  for (const row of result.rows) {
    const guildId = Number(row.guild_id);
    if (!guilds.has(guildId)) {
      guilds.set(guildId, {
        id: guildId,
        name: row.guild_name,
        members: [],
      });
    }

    if (row.character_name) {
      guilds.get(guildId).members.push({
        characterName: row.character_name,
        discordUserId: row.discord_user_id,
      });
    }
  }

  return [...guilds.values()];
}

const GUILD_ROSTER_DIVIDER = "----------------------------------------";

function formatRosterLine(member) {
  return `${member.characterName} <@${member.discordUserId}>`;
}

function buildGuildRosterMessage(roster) {
  const lines = [`**${roster.name}**`];
  const members = roster.members.map(formatRosterLine);
  const footerLines = [GUILD_ROSTER_DIVIDER];
  let length =
    lines.join("\n").length + footerLines.join("\n").length + 2;

  if (members.length === 0) {
    members.push("No active guild members listed yet.");
  }

  for (const memberLine of members) {
    if (length + memberLine.length + 1 > 1900) {
      lines.push("...and more.");
      break;
    }

    lines.push(memberLine);
    length += memberLine.length + 1;
  }

  lines.push(...footerLines);
  return lines.join("\n");
}

async function getGuildRosterTargetChannel(interaction) {
  const targetChannelId = config.guildRosterChannelId || interaction.channelId;
  const targetChannel = await interaction.client.channels.fetch(targetChannelId);
  if (!targetChannel?.send) {
    throw new Error("Guild roster channel is not a text channel.");
  }

  return {
    targetChannel,
    targetChannelId,
  };
}

async function updateGuildRosterMessages(interaction, guildIds = null) {
  const rosters = await listGuildRosterRows();
  const guildIdSet = guildIds
    ? new Set(guildIds.filter((guildId) => Number.isInteger(guildId)))
    : null;
  const rostersToUpdate = guildIdSet
    ? rosters.filter((roster) => guildIdSet.has(roster.id))
    : rosters;
  const messageResult = await pool.query(
    `
    SELECT guild_id, discord_channel_id, discord_message_id
    FROM guild_roster_messages
    `,
  );
  const messagesByGuildId = new Map(
    messageResult.rows.map((row) => [
      Number(row.guild_id),
      {
        channelId: row.discord_channel_id,
        messageId: row.discord_message_id,
      },
    ]),
  );
  const createdOrUpdated = [];

  for (const roster of rostersToUpdate) {
    const content = buildGuildRosterMessage(roster);
    const existingMessage = messagesByGuildId.get(roster.id);
    try {
      if (existingMessage) {
        const channel = await interaction.client.channels.fetch(
          existingMessage.channelId,
        );
        if (!channel?.messages) {
          throw new Error("Stored guild roster channel is not a text channel.");
        }

        const message = await channel.messages.fetch(existingMessage.messageId);
        await message.edit({
          content,
          allowedMentions: { parse: [] },
        });
        createdOrUpdated.push(roster.name);
        continue;
      }
    } catch (error) {
      console.error(
        `Failed to edit guild roster message for ${roster.name}; creating a new one:`,
        error,
      );
    }

    const { targetChannel, targetChannelId } =
      await getGuildRosterTargetChannel(interaction);
    const message = await targetChannel.send({
      content,
      allowedMentions: { parse: [] },
    });

    await pool.query(
      `
      INSERT INTO guild_roster_messages (
        guild_id,
        discord_channel_id,
        discord_message_id
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (guild_id) DO UPDATE
      SET
        discord_channel_id = EXCLUDED.discord_channel_id,
        discord_message_id = EXCLUDED.discord_message_id,
        updated_at = NOW()
      `,
      [roster.id, targetChannelId, message.id],
    );
    createdOrUpdated.push(roster.name);
  }

  return createdOrUpdated;
}

function buildJoinGuildCharacterRow(discordUserId, characters) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`join-guild-character:${discordUserId}`)
    .setPlaceholder("Choose your character...")
    .addOptions(
      characters.slice(0, 25).map((character) => ({
        label: formatCharacterName(character).slice(0, 100),
        value: character.id,
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildLeaveGuildCharacterRow(discordUserId, memberships) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`leave-guild-character:${discordUserId}`)
    .setPlaceholder("Choose your character...")
    .addOptions(
      memberships.slice(0, 25).map((membership) => ({
        label: membership.characterName.slice(0, 100),
        description: `Currently in ${membership.guildName}`.slice(0, 100),
        value: membership.westMarchesCharacterId,
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildJoinGuildGuildRow(discordUserId, characterId, guilds, currentGuildId) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`join-guild-guild:${discordUserId}:${characterId}`)
    .setPlaceholder("Choose a guild...")
    .addOptions(
      guilds.map((guild) => ({
        label: guild.name.slice(0, 100),
        value: String(guild.id),
        default: guild.id === currentGuildId,
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function parseJoinGuildGuildCustomId(customId) {
  const prefix = "join-guild-guild:";
  if (!customId.startsWith(prefix)) {
    return null;
  }

  const remainder = customId.slice(prefix.length);
  const separatorIndex = remainder.indexOf(":");
  if (separatorIndex === -1) {
    return null;
  }

  return {
    ownerId: remainder.slice(0, separatorIndex),
    characterId: remainder.slice(separatorIndex + 1),
  };
}

function buildMagicItemRarityRow(discordUserId, selectedRarity = null) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`magicitem:${discordUserId}`)
    .setPlaceholder("Select a rarity...")
    .addOptions(
      MAGIC_ITEM_RARITIES.map((rarity) => ({
        label: rarity.label,
        description: rarity.description,
        value: rarity.value,
        default: rarity.value === selectedRarity,
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildApproveCategoryRow(discordUserId) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`approve-category:${discordUserId}`)
    .setPlaceholder("Choose a homebrew type...")
    .addOptions(APPROVE_CATEGORIES);

  return new ActionRowBuilder().addComponents(menu);
}

function buildApproveDetailRow(discordUserId, category) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`approve-detail:${discordUserId}:${category}`)
    .setPlaceholder(category === "spells" ? "Choose a spell level..." : "Choose a rarity...");

  if (category === "spells") {
    menu.addOptions(
      APPROVE_SPELL_LEVELS.map((level) => ({
        label: level.label,
        value: level.value,
      })),
    );
  } else {
    const rarities =
      category === "wondrous-items"
        ? APPROVE_WONDROUS_RARITIES
        : APPROVE_RARITIES;
    menu.addOptions(
      rarities.map((rarity) => ({
        label: rarity.label,
        value: rarity.value,
      })),
    );
  }

  return new ActionRowBuilder().addComponents(menu);
}

function categoryNeedsDetail(category) {
  return ["weapons", "wondrous-items", "spells"].includes(category);
}

function getCategory(categoryValue) {
  return APPROVE_CATEGORIES.find((category) => category.value === categoryValue);
}

function getDetail(category, detailValue) {
  if (category === "spells") {
    return APPROVE_SPELL_LEVELS.find((level) => level.value === detailValue);
  }

  const rarities =
    category === "wondrous-items"
      ? APPROVE_WONDROUS_RARITIES
      : APPROVE_RARITIES;
  return rarities.find((rarity) => rarity.value === detailValue);
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getApproveTarget(category, detailValue = "") {
  const categoryConfig = getCategory(category);

  if (!categoryConfig) {
    return null;
  }

  if (category === "weapons") {
    const rarity = getDetail(category, detailValue);
    if (!rarity) {
      return null;
    }

    return {
      section: category,
      title: `${rarity.label} Weapons`,
      slug: `${rarity.value}-weapons`,
      sortOrder: rarity.sortOrder,
      labelSuffix: `${rarity.label} Weapon`,
      categoryLabel: categoryConfig.label,
      detailLabel: rarity.label,
    };
  }

  if (category === "wondrous-items") {
    const rarity = getDetail(category, detailValue);
    if (!rarity) {
      return null;
    }

    const noun = rarity.value === "varies" ? "Wondrous Item" : "Wondrous Items";
    return {
      section: category,
      title: `${rarity.label} ${noun}`,
      slug: `${rarity.value}-wondrous-${rarity.value === "varies" ? "item" : "items"}`,
      sortOrder: rarity.sortOrder,
      labelSuffix: `${rarity.label} Wondrous Item`,
      categoryLabel: categoryConfig.label,
      detailLabel: rarity.label,
    };
  }

  if (category === "spells") {
    const level = getDetail(category, detailValue);
    if (!level) {
      return null;
    }

    return {
      section: category,
      title: level.title,
      slug: level.slug ?? `spell-${level.value}-level`,
      sortOrder: level.sortOrder,
      labelSuffix: `${level.label} Spell`,
      categoryLabel: categoryConfig.label,
      detailLabel: level.label,
    };
  }

  return {
    section: category,
    title: categoryConfig.label,
    slug: slugify(categoryConfig.label),
    sortOrder: 10,
    labelSuffix: "",
    categoryLabel: categoryConfig.label,
    detailLabel: "",
  };
}

function formatApprovedLabel(name, labelSuffix) {
  const trimmedName = name.trim();

  if (!labelSuffix || trimmedName.toLowerCase().includes(labelSuffix.toLowerCase())) {
    return trimmedName;
  }

  return `${trimmedName} - ${labelSuffix}`;
}

function buildApproveModal(discordUserId, category, detailValue = "none") {
  const target = getApproveTarget(category, detailValue === "none" ? "" : detailValue);
  const title = target?.detailLabel
    ? `Approve ${target.detailLabel} ${target.categoryLabel}`
    : `Approve ${target?.categoryLabel ?? "Homebrew"}`;

  const modal = new ModalBuilder()
    .setCustomId(`approve-modal:${discordUserId}:${category}:${detailValue}`)
    .setTitle(title.slice(0, 45));

  const nameInput = new TextInputBuilder()
    .setCustomId("homebrew-name")
    .setLabel("Homebrew name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(200);

  const urlInput = new TextInputBuilder()
    .setCustomId("homebrew-url")
    .setLabel("D&D Beyond URL")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(500);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(urlInput),
  );

  return modal;
}

function buildApprovalAnnouncement(approval, approver) {
  const location = approval.detailLabel
    ? `${approval.detailLabel} ${approval.categoryLabel}`
    : approval.categoryLabel;

  return {
    content:
      `**Homebrew approved:** [${approval.label}](<${approval.href}>)\n` +
      `Category: ${location}\n` +
      `Approved by: ${approver}`,
    allowedMentions: {
      parse: [],
    },
  };
}

function normalizeHomebrewUrl(url) {
  const trimmedUrl = url.trim();
  const parsed = new URL(trimmedUrl);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("unsupported_protocol");
  }

  return parsed.toString();
}

async function approveHomebrew({ category, detailValue, name, url }) {
  const target = getApproveTarget(category, detailValue);

  if (!target) {
    throw new Error("unsupported_approve_target");
  }

  const href = normalizeHomebrewUrl(url);
  const label = formatApprovedLabel(name, target.labelSuffix);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const entryResult = await client.query(
      `
      INSERT INTO homebrew_entries (
        section,
        title,
        slug,
        body_markdown,
        sort_order,
        is_published
      )
      VALUES ($1, $2, $3, '', $4, true)
      ON CONFLICT (slug) DO UPDATE
      SET
        title = EXCLUDED.title,
        sort_order = EXCLUDED.sort_order,
        is_published = true,
        updated_at = NOW()
      RETURNING id
      `,
      [target.section, target.title, target.slug, target.sortOrder],
    );
    const homebrewEntryId = entryResult.rows[0].id;

    const itemResult = await client.query(
      `
      WITH inserted AS (
        INSERT INTO homebrew_section_items (
          homebrew_entry_id,
          parent_item_id,
          label,
          href,
          sort_order,
          is_published
        )
        SELECT $1, NULL, $2, $3, 0, true
        WHERE NOT EXISTS (
          SELECT 1
          FROM homebrew_section_items existing
          WHERE existing.homebrew_entry_id = $1
            AND (
              existing.href = $3
              OR LOWER(existing.label) = LOWER($2)
            )
        )
        RETURNING id, label, href, true AS created
      )
      SELECT id, label, href, created
      FROM inserted
      UNION ALL
      SELECT id, label, href, false AS created
      FROM homebrew_section_items existing
      WHERE existing.homebrew_entry_id = $1
        AND (
          existing.href = $3
          OR LOWER(existing.label) = LOWER($2)
        )
      LIMIT 1
      `,
      [homebrewEntryId, label, href],
    );

    await client.query("COMMIT");

    return {
      ...target,
      label: itemResult.rows[0].label,
      href: itemResult.rows[0].href,
      created: itemResult.rows[0].created,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getRandomMagicItem(rarity) {
  const result = await pool.query(
    `
    WITH ranked_items AS (
      SELECT
        id,
        name,
        ROW_NUMBER() OVER (ORDER BY sort_order ASC, id ASC) AS roll_number,
        COUNT(*) OVER () AS total_count
      FROM magic_items
      WHERE rarity = $1
        AND is_published = true
    )
    SELECT
      name AS item_label,
      roll_number,
      total_count
    FROM ranked_items
    ORDER BY RANDOM()
    LIMIT 1
    `,
    [rarity],
  );

  return result.rows[0] ?? null;
}

function getMagicItemRarityTheme(rarityValue) {
  switch (rarityValue) {
    case "common":
      return {
        color: 0x9e9e9e,
        title: "Vault Lot Drawn",
        flavor:
          "From the lower cedar racks, the quartermaster produces a serviceable charm fit for a prepared traveler.",
      };
    case "uncommon":
      return {
        color: 0x43a047,
        title: "Vault Lot Drawn",
        flavor:
          "A brighter glimmer answers the summons as the vault yields a prize of uncommon merit.",
      };
    case "rare":
      return {
        color: 0x1e88e5,
        title: "Vault Lot Drawn",
        flavor:
          "The warded cabinets part and a rarer treasure is brought forth with due ceremony.",
      };
    case "veryrare":
      return {
        color: 0x8e24aa,
        title: "Vault Lot Drawn",
        flavor:
          "The deeper sigils awaken. What emerges is no ordinary relic, but a piece of notable power.",
      };
    case "legendary":
      return {
        color: 0xffb300,
        title: "Vault Lot Drawn",
        flavor:
          "Ancient wards answer the call, and the vault releases a treasure spoken of more often than seen.",
      };
    default:
      return {
        color: 0x607d8b,
        title: "Vault Lot Drawn",
        flavor: "The vault stirs and yields its chosen prize.",
      };
  }
}

function getDisplayName(interaction) {
  if (interaction.member && "displayName" in interaction.member) {
    return interaction.member.displayName;
  }

  return interaction.user.globalName || interaction.user.username;
}

function buildMagicItemResultEmbed({
  displayName,
  userMention,
  userAvatarUrl,
  rarity,
  rollNumber,
  totalCount,
  itemName,
}) {
  const theme = getMagicItemRarityTheme(rarity.value);

  return new EmbedBuilder()
    .setColor(theme.color)
    .setAuthor({
      name: displayName,
      iconURL: userAvatarUrl,
    })
    .setTitle(theme.title)
    .setDescription(
      `${theme.flavor}\n\nMarked claimant: ${userMention}`,
    )
    .addFields(
      { name: "Rarity", value: rarity.label, inline: true },
      { name: "Roll", value: `${rollNumber} / ${totalCount}`, inline: true },
      { name: "Item", value: `**${itemName}**` },
    )
    .setThumbnail(MAGIC_ITEM_RESULT_GIF_URL)
    .setFooter({ text: "The vault stands ready for the next draw." })
    .setTimestamp();
}

const bot = new Client({
  intents: [GatewayIntentBits.Guilds],
});

bot.once("ready", async () => {
  console.log(`Logged in as ${bot.user.tag}`);
  try {
    await registerGuildCommands();
  } catch (error) {
    console.error("Failed to register slash command:", error);
  }
});

bot.on("interactionCreate", async (interaction) => {
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId.startsWith("approve-category:")) {
      const ownerId = interaction.customId.slice("approve-category:".length);
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/approve` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      if (!hasRequiredRole(interaction)) {
        await interaction.reply({
          content: "You do not have the required role to approve homebrew.",
          ephemeral: true,
        });
        return;
      }

      const category = interaction.values[0];
      const categoryConfig = getCategory(category);

      if (!categoryConfig) {
        await interaction.reply({
          content: "That homebrew type is not supported.",
          ephemeral: true,
        });
        return;
      }

      if (categoryNeedsDetail(category)) {
        await interaction.update({
          content:
            category === "spells"
              ? "Choose the spell level."
              : "Choose the item rarity.",
          components: [buildApproveDetailRow(interaction.user.id, category)],
        });
        return;
      }

      await interaction.showModal(
        buildApproveModal(interaction.user.id, category),
      );
      return;
    }

    if (interaction.customId.startsWith("approve-detail:")) {
      const [, ownerId, category] = interaction.customId.split(":");
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/approve` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      if (!hasRequiredRole(interaction)) {
        await interaction.reply({
          content: "You do not have the required role to approve homebrew.",
          ephemeral: true,
        });
        return;
      }

      const detailValue = interaction.values[0];
      if (!getApproveTarget(category, detailValue)) {
        await interaction.reply({
          content: "That approval option is not supported.",
          ephemeral: true,
        });
        return;
      }

      await interaction.showModal(
        buildApproveModal(interaction.user.id, category, detailValue),
      );
      return;
    }

    if (interaction.customId.startsWith("join-guild-character:")) {
      const ownerId = interaction.customId.slice("join-guild-character:".length);
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/join-guild` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferUpdate();

        const characterId = interaction.values[0];
        const character = await getOwnedActiveWestMarchesCharacter(
          interaction.user.id,
          characterId,
        );

        if (!character) {
          await interaction.editReply({
            content:
              "I could not find that active character under your Discord account.",
            components: [],
          });
          return;
        }

        const guilds = await listPublishedGuilds();
        if (guilds.length === 0) {
          await interaction.editReply({
            content: "No published guilds are available yet.",
            components: [],
          });
          return;
        }

        const characterName = formatCharacterName(character);
        const membership = await getGuildRosterMembership({
          characterId: character.id,
          characterName,
          discordUserId: interaction.user.id,
        });
        const cooldownUntil = getGuildRosterCooldownUntil(membership);

        if (cooldownUntil) {
          await interaction.editReply({
            content:
              `**${characterName}** is currently in **${membership.guildName}**. ` +
              `They can change guild again ${formatDiscordTimestamp(cooldownUntil)}.`,
            components: [],
          });
          return;
        }

        await interaction.editReply({
          content: membership
            ? `**${characterName}** is currently in **${membership.guildName}**. Choose a different guild if you want to move them.`
            : `Choose the guild **${characterName}** should join.`,
          components: [
            buildJoinGuildGuildRow(
              interaction.user.id,
              character.id,
              guilds,
              membership?.guildId ?? null,
            ),
          ],
        });
      } catch (error) {
        console.error("Failed to process /join-guild character select:", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content:
              "Something went wrong while loading guild choices. Please try again.",
            components: [],
          });
        } else {
          await interaction.reply({
            content:
              "Something went wrong while loading guild choices. Please try again.",
            ephemeral: true,
          });
        }
      }

      return;
    }

    if (interaction.customId.startsWith("join-guild-guild:")) {
      const parsedCustomId = parseJoinGuildGuildCustomId(interaction.customId);
      if (!parsedCustomId || parsedCustomId.ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/join-guild` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferUpdate();

        const guildId = Number(interaction.values[0]);
        if (!Number.isInteger(guildId) || guildId <= 0) {
          await interaction.editReply({
            content: "That guild selection is not valid.",
            components: [],
          });
          return;
        }

        const character = await getOwnedActiveWestMarchesCharacter(
          interaction.user.id,
          parsedCustomId.characterId,
        );

        if (!character) {
          await interaction.editReply({
            content:
              "I could not find that active character under your Discord account.",
            components: [],
          });
          return;
        }

        const characterName = formatCharacterName(character);
        const result = await upsertGuildRosterMembership({
          guildId,
          characterId: character.id,
          characterName,
          discordUserId: interaction.user.id,
        });

        if (!result) {
          await interaction.editReply({
            content: "That guild is not available.",
            components: [],
          });
          return;
        }

        const { membership, previousMembership, cooldownUntil } = result;

        if (cooldownUntil) {
          await interaction.editReply({
            content:
              `**${characterName}** changed guild recently. ` +
              `They can change guild again ${formatDiscordTimestamp(cooldownUntil)}.`,
            components: [],
          });
          return;
        }

        if (previousMembership?.guildId === membership.guildId) {
          await interaction.editReply({
            content: `**${characterName}** is already in **${membership.guildName}**.`,
            components: [],
          });
          return;
        }

        await updateGuildRosterMessages(
          interaction,
          [
            previousMembership?.guildId,
            membership.guildId,
          ].filter(Boolean),
        );

        await interaction.editReply({
          content: previousMembership
            ? `Moved **${characterName}** from **${previousMembership.guildName}** to **${membership.guildName}**.`
            : `Added **${characterName}** to **${membership.guildName}**.`,
          components: [],
        });

        if (interaction.channel?.send) {
          await interaction.channel.send({
            content: previousMembership
              ? `**${characterName}** has moved from **${previousMembership.guildName}** to **${membership.guildName}**.`
              : `**${characterName}** has joined **${membership.guildName}**.`,
            allowedMentions: { parse: [] },
          });
        }
      } catch (error) {
        console.error("Failed to process /join-guild guild select:", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content:
              "Something went wrong while updating the guild roster. Please try again.",
            components: [],
          });
        } else {
          await interaction.reply({
            content:
              "Something went wrong while updating the guild roster. Please try again.",
            ephemeral: true,
          });
        }
      }

      return;
    }

    if (interaction.customId.startsWith("leave-guild-character:")) {
      const ownerId = interaction.customId.slice("leave-guild-character:".length);
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/leave-guild` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferUpdate();

        const characterId = interaction.values[0];
        const character = await getOwnedActiveWestMarchesCharacter(
          interaction.user.id,
          characterId,
        );

        if (!character) {
          await interaction.editReply({
            content:
              "I could not find that active character under your Discord account.",
            components: [],
          });
          return;
        }

        const deleteResult = await deleteGuildRosterMembership({
          characterId: character.id,
          characterName: formatCharacterName(character),
          discordUserId: interaction.user.id,
        });
        const { membership, cooldownUntil } = deleteResult;

        if (!membership) {
          await interaction.editReply({
            content: `**${formatCharacterName(character)}** is not currently in a guild roster.`,
            components: [],
          });
          return;
        }

        if (cooldownUntil) {
          await interaction.editReply({
            content:
              `**${membership.characterName}** changed guild recently. ` +
              `They can leave or change guild again ${formatDiscordTimestamp(cooldownUntil)}.`,
            components: [],
          });
          return;
        }

        await updateGuildRosterMessages(interaction, [membership.guildId]);

        await interaction.editReply({
          content: `Removed **${membership.characterName}** from **${membership.guildName}**.`,
          components: [],
        });

        if (interaction.channel?.send) {
          await interaction.channel.send({
            content: `**${membership.characterName}** has left **${membership.guildName}**.`,
            allowedMentions: { parse: [] },
          });
        }
      } catch (error) {
        console.error("Failed to process /leave-guild character select:", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content:
              "Something went wrong while updating the guild roster. Please try again.",
            components: [],
          });
        } else {
          await interaction.reply({
            content:
              "Something went wrong while updating the guild roster. Please try again.",
            ephemeral: true,
          });
        }
      }

      return;
    }

    if (!interaction.customId.startsWith("magicitem:")) {
      return;
    }

    const ownerId = interaction.customId.slice("magicitem:".length);
    if (ownerId !== interaction.user.id) {
      await interaction.reply({
        content: "Use your own `/magicitem` command so the menu belongs to you.",
        ephemeral: true,
      });
      return;
    }

    try {
      const selectedRarity = interaction.values[0];
      const rarity = MAGIC_ITEM_RARITIES.find(
        (entry) => entry.value === selectedRarity,
      );

      if (!rarity) {
        await interaction.reply({
          content: "That rarity is not supported.",
          ephemeral: true,
        });
        return;
      }

      const item = await getRandomMagicItem(selectedRarity);
      if (!item) {
        await interaction.update({
          content:
            `No published magic items are available for **${rarity.label}** yet.`,
          components: [
            buildMagicItemRarityRow(interaction.user.id, selectedRarity),
          ],
        });
        return;
      }

      await interaction.update({
        content:
          `**${rarity.label} Magic Item:** ${item.item_label}\nUse the menu to roll again.`,
        components: [
          buildMagicItemRarityRow(interaction.user.id, selectedRarity),
        ],
      });

      try {
        const displayName = getDisplayName(interaction);
        await interaction.followUp({
          content: `${interaction.user}`,
          embeds: [
            buildMagicItemResultEmbed({
              displayName,
              userMention: interaction.user.toString(),
              userAvatarUrl: interaction.user.displayAvatarURL(),
              rarity,
              rollNumber: item.roll_number,
              totalCount: item.total_count,
              itemName: item.item_label,
            }),
          ],
          ephemeral: false,
          allowedMentions: {
            parse: [],
            users: [interaction.user.id],
          },
        });
      } catch (postError) {
        console.error("Failed to post public magic item result:", postError);
      }
    } catch (error) {
      console.error("Failed to process magic item select menu:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while rolling your magic item. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while rolling your magic item. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith("faq-add-modal:")) {
      const ownerId = interaction.customId.slice("faq-add-modal:".length);
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/faq-add` command so the form belongs to you.",
          ephemeral: true,
        });
        return;
      }

      if (!hasRequiredRole(interaction)) {
        await interaction.reply({
          content: "You do not have the required role to add FAQ entries.",
          ephemeral: true,
        });
        return;
      }

      try {
        await interaction.deferReply({ ephemeral: true });

        const faqEntry = await upsertFaqEntry({
          categoryName: interaction.fields.getTextInputValue("faq-category"),
          question: interaction.fields.getTextInputValue("faq-question"),
          answer: interaction.fields.getTextInputValue("faq-answer"),
        });

        await interaction.editReply(
          `Saved FAQ entry **${faqEntry.question}** under **${faqEntry.category_name}**.`,
        );
      } catch (error) {
        console.error("Failed to process /faq-add modal:", error);
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(
            "Something went wrong while saving that FAQ entry. Please try again.",
          );
        } else {
          await interaction.reply({
            content:
              "Something went wrong while saving that FAQ entry. Please try again.",
            ephemeral: true,
          });
        }
      }

      return;
    }

    if (!interaction.customId.startsWith("approve-modal:")) {
      return;
    }

    const [, ownerId, category, detailValue] = interaction.customId.split(":");
    if (ownerId !== interaction.user.id) {
      await interaction.reply({
        content: "Use your own `/approve` command so the form belongs to you.",
        ephemeral: true,
      });
      return;
    }

    if (!hasRequiredRole(interaction)) {
      await interaction.reply({
        content: "You do not have the required role to approve homebrew.",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      const name = interaction.fields.getTextInputValue("homebrew-name");
      const url = interaction.fields.getTextInputValue("homebrew-url");
      const approval = await approveHomebrew({
        category,
        detailValue: detailValue === "none" ? "" : detailValue,
        name,
        url,
      });

      await interaction.editReply(
        approval.created
          ? `Approved **${approval.label}** under **${approval.title}**.\n${approval.href}`
          : `That homebrew was already listed under **${approval.title}** as **${approval.label}**.\n${approval.href}`,
      );

      if (approval.created && interaction.channel?.send) {
        try {
          await interaction.channel.send(
            buildApprovalAnnouncement(approval, interaction.user.toString()),
          );
        } catch (postError) {
          console.error("Failed to post /approve announcement:", postError);
          await interaction.followUp({
            content:
              "The homebrew was approved, but I could not post the public channel announcement.",
            ephemeral: true,
          });
        }
      }
    } catch (error) {
      console.error("Failed to process /approve modal:", error);
      const message =
        error instanceof TypeError
          ? "That URL is not valid. Please run `/approve` again with a full URL."
          : "Something went wrong while approving that homebrew. Please try again.";

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(message);
      } else {
        await interaction.reply({ content: message, ephemeral: true });
      }
    }

    return;
  }

  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (!interaction.inGuild() || interaction.guildId !== config.guildId) {
    await interaction.reply({
      content: "Use this command inside the server.",
      ephemeral: true,
    });
    return;
  }

  if (interaction.commandName === "magicitem") {
    await interaction.reply({
      content: "Choose a rarity to roll a random magic item.",
      components: [buildMagicItemRarityRow(interaction.user.id)],
      ephemeral: true,
    });
    return;
  }

  if (interaction.commandName === "help") {
    await interaction.reply({
      content: buildHelpMessage(interaction),
      ephemeral: true,
    });
    return;
  }

  if (interaction.commandName === "characters") {
    if (!isWestMarchesConfigured()) {
      await interaction.reply({
        content:
          "West Marches API access is not configured, so I cannot load your characters yet.",
        ephemeral: true,
      });
      return;
    }

    const visibility =
      interaction.options.getString("visibility") === "public"
        ? "public"
        : "private";
    const isPublic = visibility === "public";

    try {
      await interaction.deferReply({ ephemeral: !isPublic });
      const characters = await listOwnedCharacterSummaries(interaction.user.id);
      await interaction.editReply({
        embeds: [
          buildCharacterListEmbed({
            displayName: getDisplayName(interaction),
            characters,
          }),
        ],
      });
    } catch (error) {
      console.error("Failed to process /characters:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while loading your characters. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while loading your characters. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "faq") {
    try {
      await interaction.deferReply({ ephemeral: true });
      const categories = await listFaqEntries();
      await interaction.editReply({
        embeds: buildFaqEmbeds(categories),
      });
    } catch (error) {
      console.error("Failed to process /faq:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while loading the FAQ. Please try again.",
        );
      } else {
        await interaction.reply({
          content: "Something went wrong while loading the FAQ. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "faq-add") {
    if (!hasRequiredRole(interaction)) {
      await interaction.reply({
        content: "You do not have the required role to add FAQ entries.",
        ephemeral: true,
      });
      return;
    }

    await interaction.showModal(buildFaqAddModal(interaction.user.id));
    return;
  }

  if (interaction.commandName === "join-guild") {
    if (!isWestMarchesConfigured()) {
      await interaction.reply({
        content:
          "West Marches API access is not configured, so I cannot load your characters yet.",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      const characters = await listOwnedActiveWestMarchesCharacters(
        interaction.user.id,
      );

      if (characters.length === 0) {
        await interaction.editReply(
          "I could not find any active WestMarches.games characters linked to your Discord account.",
        );
        return;
      }

      const visibleCharacters = characters.slice(0, 25);
      const overflowText =
        characters.length > visibleCharacters.length
          ? `\n\nI found ${characters.length} active characters. Discord menus can only show 25 options, so only the first 25 by name are listed.`
          : "";

      await interaction.editReply({
        content: `Choose the character you want to add to a guild.${overflowText}`,
        components: [
          buildJoinGuildCharacterRow(interaction.user.id, visibleCharacters),
        ],
      });
    } catch (error) {
      console.error("Failed to process /join-guild:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while loading your characters. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while loading your characters. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "leave-guild") {
    if (!isWestMarchesConfigured()) {
      await interaction.reply({
        content:
          "West Marches API access is not configured, so I cannot verify your characters yet.",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      const [characters, memberships] = await Promise.all([
        listOwnedActiveWestMarchesCharacters(interaction.user.id),
        listGuildRosterMembershipsForDiscordUser(interaction.user.id),
      ]);
      const ownedCharacterIds = new Set(
        characters.map((character) => character.id),
      );
      const leaveOptions = memberships.filter((membership) =>
        ownedCharacterIds.has(membership.westMarchesCharacterId),
      );

      if (leaveOptions.length === 0) {
        await interaction.editReply(
          "I could not find any of your active characters in a guild roster.",
        );
        return;
      }

      const visibleMemberships = leaveOptions.slice(0, 25);
      const overflowText =
        leaveOptions.length > visibleMemberships.length
          ? `\n\nI found ${leaveOptions.length} rostered active characters. Discord menus can only show 25 options, so only the first 25 by name are listed.`
          : "";

      await interaction.editReply({
        content: `Choose the character you want to remove from their guild.${overflowText}`,
        components: [
          buildLeaveGuildCharacterRow(interaction.user.id, visibleMemberships),
        ],
      });
    } catch (error) {
      console.error("Failed to process /leave-guild:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while loading your guild roster entries. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while loading your guild roster entries. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "post-guild-rosters") {
    if (!hasRequiredRole(interaction)) {
      await interaction.reply({
        content: "You do not have the required role to post guild rosters.",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });
      const updatedGuilds = await updateGuildRosterMessages(interaction);
      await interaction.editReply(
        updatedGuilds.length
          ? `Posted or refreshed ${updatedGuilds.length} guild roster messages.`
          : "No published guild rosters were found to post.",
      );
    } catch (error) {
      console.error("Failed to process /post-guild-rosters:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while posting the guild rosters. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while posting the guild rosters. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "boss-start") {
    if (!hasRequiredRole(interaction)) {
      await interaction.reply({
        content: "You do not have the required role to start a boss fight.",
        ephemeral: true,
      });
      return;
    }

    const name = interaction.options.getString("name", true).trim();
    const maxHp = BigInt(interaction.options.getInteger("max-hp", true));
    const imageUrl = interaction.options.getString("image-url")?.trim() || null;

    if (!name) {
      await interaction.reply({
        content: "Boss name is required.",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });
      const boss = await startBossFight({ name, maxHp, imageUrl });
      const status = await postOrRefreshBossStatus(interaction, boss);
      await interaction.editReply(
        `Started **${boss.name}** with ${formatBossHp(boss.maxHp)} HP and ${status.created ? "posted" : "refreshed"} the boss status message.`,
      );
    } catch (error) {
      console.error("Failed to process /boss-start:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while starting the boss fight. Please check that the boss tables exist and try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while starting the boss fight. Please check that the boss tables exist and try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "boss-post") {
    if (!hasRequiredRole(interaction)) {
      await interaction.reply({
        content: "You do not have the required role to post the boss status.",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });
      const boss = await getActiveBoss();
      if (!boss) {
        await interaction.editReply("No active boss fight is configured.");
        return;
      }

      const status = await postOrRefreshBossStatus(interaction, boss);
      await interaction.editReply(
        `${status.created ? "Posted" : "Refreshed"} the boss status message for **${boss.name}**.`,
      );
    } catch (error) {
      console.error("Failed to process /boss-post:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while posting the boss status. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while posting the boss status. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (
    interaction.commandName === "boss-damage" ||
    interaction.commandName === "boss-heal"
  ) {
    const isHeal = interaction.commandName === "boss-heal";
    if (!hasRequiredRole(interaction)) {
      await interaction.reply({
        content: `You do not have the required role to ${isHeal ? "heal" : "damage"} the boss.`,
        ephemeral: true,
      });
      return;
    }

    const amount = BigInt(interaction.options.getInteger("amount", true));
    const reason = interaction.options.getString("reason")?.trim() || null;

    try {
      await interaction.deferReply({ ephemeral: true });
      const boss = await recordBossHpEntry({
        discordUserId: interaction.user.id,
        amount,
        entryType: isHeal ? "heal" : "damage",
        reason,
      });

      if (!boss) {
        await interaction.editReply("No active boss fight is configured.");
        return;
      }

      await postOrRefreshBossStatus(interaction, boss);
      await interaction.editReply(
        `${isHeal ? "Restored" : "Recorded"} ${formatBossHp(amount)} HP ${isHeal ? "to" : "against"} **${boss.name}**. Current HP: ${formatBossHp(boss.currentHp)}/${formatBossHp(boss.maxHp)}.`,
      );
    } catch (error) {
      console.error(`Failed to process /${interaction.commandName}:`, error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while updating the boss HP. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while updating the boss HP. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "boss-status") {
    try {
      await interaction.deferReply({ ephemeral: true });
      const boss = await getActiveBoss();
      if (!boss) {
        await interaction.editReply("No active boss fight is configured.");
        return;
      }

      await interaction.editReply({ embeds: [buildBossStatusEmbed(boss)] });
    } catch (error) {
      console.error("Failed to process /boss-status:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while loading the boss status. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while loading the boss status. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "boss-log") {
    try {
      await interaction.deferReply({ ephemeral: true });
      const boss = await getActiveBoss();
      if (!boss) {
        await interaction.editReply("No active boss fight is configured.");
        return;
      }

      const entries = await listBossLogEntries(boss.id);
      await interaction.editReply({ embeds: [buildBossLogEmbed(boss, entries)] });
    } catch (error) {
      console.error("Failed to process /boss-log:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while loading the boss log. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while loading the boss log. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.commandName === "approve") {
    if (!hasRequiredRole(interaction)) {
      await interaction.reply({
        content: "You do not have the required role to approve homebrew.",
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: "Choose the type of homebrew to approve.",
      components: [buildApproveCategoryRow(interaction.user.id)],
      ephemeral: true,
    });
    return;
  }

  if (interaction.commandName !== "cc-link") {
    return;
  }

  if (!hasRequiredRole(interaction)) {
    await interaction.reply({
      content: "You do not have the required role to request a CC link.",
      ephemeral: true,
    });
    return;
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    const campaign = await getOrAssignCampaign(interaction.user.id);
    if (!campaign) {
      await interaction.editReply(
        "No active campaign links are currently available. Please contact staff.",
      );
      return;
    }

    await interaction.editReply(
      `Your assigned campaign is **${campaign.code}**.\nJoin link: ${campaign.invite_url}`,
    );
  } catch (error) {
    console.error("Failed to process /cc-link:", error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(
        "Something went wrong while fetching your link. Please try again.",
      );
    } else {
      await interaction.reply({
        content:
          "Something went wrong while fetching your link. Please try again.",
        ephemeral: true,
      });
    }
  }
});

bot.login(config.token);
