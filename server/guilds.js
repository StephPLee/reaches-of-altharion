const { pool } = require("./db");

function mapGuildRow(row) {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    emblemSrc: row.emblem_src,
    emblemAlt: row.emblem_alt,
    summary: row.summary,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    upgrades: [],
  };
}

function mapGuildUpgradeRow(row) {
  return {
    id: Number(row.id),
    guildId: Number(row.guild_id),
    title: row.title,
    requirement: row.requirement,
    reward: row.reward,
    details: row.details,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    automationEntries: [],
  };
}

function mapGuildAutomationEntryRow(row) {
  return {
    id: Number(row.id),
    guildUpgradeId: row.guild_upgrade_id ? Number(row.guild_upgrade_id) : null,
    panelTitle: row.panel_title,
    panelSubtitle: row.panel_subtitle,
    sortOrder: row.sort_order,
    setupCommands: [],
    codeBlocks: [],
  };
}

async function listGuilds() {
  const guildsResult = await pool.query(
    `
    SELECT
      id,
      name,
      slug,
      emblem_src,
      emblem_alt,
      summary,
      sort_order,
      is_published,
      created_at,
      updated_at
    FROM guilds
    WHERE is_published = true
    ORDER BY LOWER(name) ASC, id ASC
    `,
  );

  const guilds = guildsResult.rows.map(mapGuildRow);

  if (guilds.length === 0) {
    return [];
  }

  const guildIds = guilds.map((guild) => guild.id);
  const upgradesResult = await pool.query(
    `
    SELECT
      id,
      guild_id,
      title,
      requirement,
      reward,
      details,
      sort_order,
      is_published,
      created_at,
      updated_at
    FROM guild_upgrades
    WHERE guild_id = ANY($1::bigint[])
      AND is_published = true
    ORDER BY guild_id ASC, sort_order ASC, id ASC
    `,
    [guildIds],
  );

  const guildsById = new Map(guilds.map((guild) => [guild.id, guild]));
  const upgrades = [];
  const upgradesById = new Map();

  for (const row of upgradesResult.rows) {
    const upgrade = mapGuildUpgradeRow(row);
    upgrades.push(upgrade);
    upgradesById.set(upgrade.id, upgrade);
    const guild = guildsById.get(upgrade.guildId);
    if (guild) {
      guild.upgrades.push(upgrade);
    }
  }

  if (upgrades.length > 0) {
    const upgradeIds = upgrades.map((upgrade) => upgrade.id);
    const automationEntriesResult = await pool.query(
      `
      SELECT
        id,
        guild_upgrade_id,
        panel_title,
        panel_subtitle,
        sort_order
      FROM homebrew_automation_entries
      WHERE guild_upgrade_id = ANY($1::bigint[])
      ORDER BY guild_upgrade_id ASC, sort_order ASC, id ASC
      `,
      [upgradeIds],
    );

    const automationEntries = automationEntriesResult.rows.map(
      mapGuildAutomationEntryRow,
    );
    const automationEntryIds = automationEntries.map((entry) => entry.id);
    const setupCommandsByAutomationId = new Map();
    const codeBlocksByAutomationId = new Map();

    if (automationEntryIds.length > 0) {
      const setupCommandsResult = await pool.query(
        `
        SELECT
          id,
          automation_entry_id,
          label,
          command,
          sort_order
        FROM homebrew_automation_setup_commands
        WHERE automation_entry_id = ANY($1::bigint[])
        ORDER BY automation_entry_id ASC, sort_order ASC, id ASC
        `,
        [automationEntryIds],
      );

      for (const row of setupCommandsResult.rows) {
        const automationEntryId = Number(row.automation_entry_id);
        const current =
          setupCommandsByAutomationId.get(automationEntryId) ?? [];
        current.push({
          id: Number(row.id),
          label: row.label,
          command: row.command,
          sortOrder: row.sort_order,
        });
        setupCommandsByAutomationId.set(automationEntryId, current);
      }

      const codeBlocksResult = await pool.query(
        `
        SELECT
          id,
          automation_entry_id,
          title,
          code,
          download_name,
          sort_order
        FROM homebrew_automation_code_blocks
        WHERE automation_entry_id = ANY($1::bigint[])
        ORDER BY automation_entry_id ASC, sort_order ASC, id ASC
        `,
        [automationEntryIds],
      );

      for (const row of codeBlocksResult.rows) {
        const automationEntryId = Number(row.automation_entry_id);
        const current = codeBlocksByAutomationId.get(automationEntryId) ?? [];
        current.push({
          id: Number(row.id),
          title: row.title,
          code: row.code,
          downloadName: row.download_name,
          sortOrder: row.sort_order,
        });
        codeBlocksByAutomationId.set(automationEntryId, current);
      }
    }

    for (const automationEntry of automationEntries) {
      automationEntry.setupCommands =
        setupCommandsByAutomationId.get(automationEntry.id) ?? [];
      automationEntry.codeBlocks =
        codeBlocksByAutomationId.get(automationEntry.id) ?? [];
      const upgrade = automationEntry.guildUpgradeId
        ? upgradesById.get(automationEntry.guildUpgradeId)
        : null;

      if (upgrade) {
        upgrade.automationEntries.push(automationEntry);
      }
    }
  }

  return guilds;
}

async function listGuildRosters() {
  const result = await pool.query(
    `
    SELECT
      g.id AS guild_id,
      g.name AS guild_name,
      g.sort_order,
      m.character_name,
      r.renown
    FROM guilds g
    LEFT JOIN guild_roster_memberships m ON m.guild_id = g.id
    LEFT JOIN character_guild_renown r
      ON r.westmarches_character_id = m.westmarches_character_id
      AND r.guild_id = g.id
    WHERE g.is_published = true
    ORDER BY g.sort_order ASC, LOWER(g.name) ASC, LOWER(m.character_name) ASC NULLS LAST
    `,
  );

  const rostersByGuildId = new Map();

  for (const row of result.rows) {
    const guildId = Number(row.guild_id);
    if (!rostersByGuildId.has(guildId)) {
      rostersByGuildId.set(guildId, {
        guildName: row.guild_name,
        memberCount: 0,
        members: [],
      });
    }

    if (row.character_name) {
      const roster = rostersByGuildId.get(guildId);
      roster.members.push({
        name: row.character_name,
        renown: row.renown ?? 0,
      });
      roster.memberCount += 1;
    }
  }

  return {
    rosters: [...rostersByGuildId.values()],
  };
}

async function upsertGuildUpgradeAutomation(
  client,
  {
    automationEntryId = null,
    guildUpgradeId,
    panelTitle,
    panelSubtitle,
    setupCommands,
    codeBlocks,
  },
) {
  let automationEntryResult;

  if (automationEntryId) {
    automationEntryResult = await client.query(
      `
      UPDATE homebrew_automation_entries
      SET
        guild_upgrade_id = $2,
        panel_title = $3,
        panel_subtitle = $4,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        guild_upgrade_id,
        panel_title,
        panel_subtitle,
        sort_order
      `,
      [automationEntryId, guildUpgradeId, panelTitle, panelSubtitle],
    );

    if (!automationEntryResult.rows[0]) {
      return null;
    }

    await client.query(
      `
      DELETE FROM homebrew_automation_setup_commands
      WHERE automation_entry_id = $1
      `,
      [automationEntryId],
    );

    await client.query(
      `
      DELETE FROM homebrew_automation_code_blocks
      WHERE automation_entry_id = $1
      `,
      [automationEntryId],
    );
  } else {
    automationEntryResult = await client.query(
      `
      INSERT INTO homebrew_automation_entries (
        guild_upgrade_id,
        anchor_mode,
        panel_title,
        panel_subtitle,
        sort_order
      )
      VALUES ($1, 'guild_upgrade', $2, $3, 0)
      RETURNING
        id,
        guild_upgrade_id,
        panel_title,
        panel_subtitle,
        sort_order
      `,
      [guildUpgradeId, panelTitle, panelSubtitle],
    );
  }

  const automationEntry = mapGuildAutomationEntryRow(
    automationEntryResult.rows[0],
  );

  for (let index = 0; index < setupCommands.length; index += 1) {
    const setupCommand = setupCommands[index];
    const result = await client.query(
      `
      INSERT INTO homebrew_automation_setup_commands (
        automation_entry_id,
        label,
        command,
        sort_order
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, label, command, sort_order
      `,
      [automationEntry.id, setupCommand.label, setupCommand.command, index],
    );

    automationEntry.setupCommands.push({
      id: Number(result.rows[0].id),
      label: result.rows[0].label,
      command: result.rows[0].command,
      sortOrder: result.rows[0].sort_order,
    });
  }

  for (let index = 0; index < codeBlocks.length; index += 1) {
    const codeBlock = codeBlocks[index];
    const result = await client.query(
      `
      INSERT INTO homebrew_automation_code_blocks (
        automation_entry_id,
        title,
        code,
        download_name,
        sort_order
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, title, code, download_name, sort_order
      `,
      [
        automationEntry.id,
        codeBlock.title,
        codeBlock.code,
        codeBlock.downloadName,
        index,
      ],
    );

    automationEntry.codeBlocks.push({
      id: Number(result.rows[0].id),
      title: result.rows[0].title,
      code: result.rows[0].code,
      downloadName: result.rows[0].download_name,
      sortOrder: result.rows[0].sort_order,
    });
  }

  return automationEntry;
}

async function createGuild({
  name,
  slug,
  emblemSrc,
  emblemAlt,
  summary,
  sortOrder,
  isPublished,
  createdByUserId,
}) {
  const result = await pool.query(
    `
    INSERT INTO guilds (
      name,
      slug,
      emblem_src,
      emblem_alt,
      summary,
      sort_order,
      is_published,
      created_by_user_id,
      updated_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
    RETURNING
      id,
      name,
      slug,
      emblem_src,
      emblem_alt,
      summary,
      sort_order,
      is_published,
      created_at,
      updated_at
    `,
    [
      name,
      slug,
      emblemSrc,
      emblemAlt,
      summary,
      sortOrder,
      isPublished,
      createdByUserId,
    ],
  );

  return mapGuildRow(result.rows[0]);
}

async function updateGuild({
  guildId,
  name,
  slug,
  emblemSrc,
  emblemAlt,
  summary,
  sortOrder,
  isPublished,
  updatedByUserId,
}) {
  const result = await pool.query(
    `
    UPDATE guilds
    SET
      name = $2,
      slug = $3,
      emblem_src = $4,
      emblem_alt = $5,
      summary = $6,
      sort_order = $7,
      is_published = $8,
      updated_by_user_id = $9,
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      name,
      slug,
      emblem_src,
      emblem_alt,
      summary,
      sort_order,
      is_published,
      created_at,
      updated_at
    `,
    [
      guildId,
      name,
      slug,
      emblemSrc,
      emblemAlt,
      summary,
      sortOrder,
      isPublished,
      updatedByUserId,
    ],
  );

  return result.rows[0] ? mapGuildRow(result.rows[0]) : null;
}

async function deleteGuild(guildId) {
  const result = await pool.query(
    `
    DELETE FROM guilds
    WHERE id = $1
    RETURNING id
    `,
    [guildId],
  );

  return result.rows[0] || null;
}

async function createGuildUpgrade({
  guildId,
  title,
  requirement,
  reward,
  details,
  sortOrder,
  isPublished,
  createdByUserId,
}) {
  const result = await pool.query(
    `
    INSERT INTO guild_upgrades (
      guild_id,
      title,
      requirement,
      reward,
      details,
      sort_order,
      is_published,
      created_by_user_id,
      updated_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
    RETURNING
      id,
      guild_id,
      title,
      requirement,
      reward,
      details,
      sort_order,
      is_published,
      created_at,
      updated_at
    `,
    [
      guildId,
      title,
      requirement,
      reward,
      details,
      sortOrder,
      isPublished,
      createdByUserId,
    ],
  );

  return mapGuildUpgradeRow(result.rows[0]);
}

async function updateGuildUpgrade({
  upgradeId,
  title,
  requirement,
  reward,
  details,
  sortOrder,
  isPublished,
  updatedByUserId,
}) {
  const result = await pool.query(
    `
    UPDATE guild_upgrades
    SET
      title = $2,
      requirement = $3,
      reward = $4,
      details = $5,
      sort_order = $6,
      is_published = $7,
      updated_by_user_id = $8,
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      guild_id,
      title,
      requirement,
      reward,
      details,
      sort_order,
      is_published,
      created_at,
      updated_at
    `,
    [
      upgradeId,
      title,
      requirement,
      reward,
      details,
      sortOrder,
      isPublished,
      updatedByUserId,
    ],
  );

  return result.rows[0] ? mapGuildUpgradeRow(result.rows[0]) : null;
}

async function deleteGuildUpgrade(upgradeId) {
  const result = await pool.query(
    `
    DELETE FROM guild_upgrades
    WHERE id = $1
    RETURNING id
    `,
    [upgradeId],
  );

  return result.rows[0] || null;
}

async function createGuildUpgradeAutomation({
  guildUpgradeId,
  panelTitle,
  panelSubtitle,
  setupCommands,
  codeBlocks,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const automationEntry = await upsertGuildUpgradeAutomation(client, {
      guildUpgradeId,
      panelTitle,
      panelSubtitle,
      setupCommands,
      codeBlocks,
    });
    await client.query("COMMIT");
    return automationEntry;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateGuildUpgradeAutomation({
  automationEntryId,
  guildUpgradeId,
  panelTitle,
  panelSubtitle,
  setupCommands,
  codeBlocks,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const automationEntry = await upsertGuildUpgradeAutomation(client, {
      automationEntryId,
      guildUpgradeId,
      panelTitle,
      panelSubtitle,
      setupCommands,
      codeBlocks,
    });
    await client.query("COMMIT");
    return automationEntry;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function deleteGuildUpgradeAutomation(automationEntryId) {
  const result = await pool.query(
    `
    DELETE FROM homebrew_automation_entries
    WHERE id = $1
    RETURNING id
    `,
    [automationEntryId],
  );

  return result.rows[0] || null;
}

module.exports = {
  createGuild,
  createGuildUpgradeAutomation,
  createGuildUpgrade,
  deleteGuild,
  deleteGuildUpgradeAutomation,
  deleteGuildUpgrade,
  listGuildRosters,
  listGuilds,
  updateGuild,
  updateGuildUpgradeAutomation,
  updateGuildUpgrade,
};
