const { pool } = require("./db");

function mapBoonRow(row) {
  return {
    id: Number(row.id),
    title: row.title,
    slug: row.slug,
    contentMarkdown: row.content_markdown,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    automationEntries: [],
  };
}

function mapBoonAutomationRow(row) {
  return {
    id: Number(row.id),
    boonId: row.boon_id ? Number(row.boon_id) : null,
    panelTitle: row.panel_title,
    panelSubtitle: row.panel_subtitle,
    sortOrder: row.sort_order,
    setupCommands: [],
    codeBlocks: [],
  };
}

async function listBoons() {
  const boonsResult = await pool.query(
    `
    SELECT
      id,
      title,
      slug,
      content_markdown,
      sort_order,
      is_published,
      created_at,
      updated_at
    FROM boons
    WHERE is_published = true
    ORDER BY LOWER(title) ASC, id ASC
    `,
  );

  const boons = boonsResult.rows.map(mapBoonRow);

  if (boons.length === 0) {
    return [];
  }

  const boonIds = boons.map((boon) => boon.id);
  const automationEntriesResult = await pool.query(
    `
    SELECT
      id,
      boon_id,
      panel_title,
      panel_subtitle,
      sort_order
    FROM homebrew_automation_entries
    WHERE boon_id = ANY($1::bigint[])
    ORDER BY boon_id ASC, sort_order ASC, id ASC
    `,
    [boonIds],
  );

  const automationEntries = automationEntriesResult.rows.map(
    mapBoonAutomationRow,
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
      const current = setupCommandsByAutomationId.get(automationEntryId) ?? [];
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

  const boonsById = new Map(boons.map((boon) => [boon.id, boon]));

  for (const automationEntry of automationEntries) {
    automationEntry.setupCommands =
      setupCommandsByAutomationId.get(automationEntry.id) ?? [];
    automationEntry.codeBlocks =
      codeBlocksByAutomationId.get(automationEntry.id) ?? [];

    if (automationEntry.boonId) {
      boonsById.get(automationEntry.boonId)?.automationEntries.push(
        automationEntry,
      );
    }
  }

  return boons;
}

async function createBoon({
  title,
  slug,
  contentMarkdown,
  sortOrder,
  isPublished,
  createdByUserId,
}) {
  const result = await pool.query(
    `
    INSERT INTO boons (
      title,
      slug,
      content_markdown,
      sort_order,
      is_published,
      created_by_user_id,
      updated_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $6)
    RETURNING
      id,
      title,
      slug,
      content_markdown,
      sort_order,
      is_published,
      created_at,
      updated_at
    `,
    [title, slug, contentMarkdown, sortOrder, isPublished, createdByUserId],
  );

  return mapBoonRow(result.rows[0]);
}

async function updateBoon({
  boonId,
  title,
  slug,
  contentMarkdown,
  sortOrder,
  isPublished,
  updatedByUserId,
}) {
  const result = await pool.query(
    `
    UPDATE boons
    SET
      title = $2,
      slug = $3,
      content_markdown = $4,
      sort_order = $5,
      is_published = $6,
      updated_by_user_id = $7,
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      title,
      slug,
      content_markdown,
      sort_order,
      is_published,
      created_at,
      updated_at
    `,
    [
      boonId,
      title,
      slug,
      contentMarkdown,
      sortOrder,
      isPublished,
      updatedByUserId,
    ],
  );

  return result.rows[0] ? mapBoonRow(result.rows[0]) : null;
}

async function deleteBoon(boonId) {
  const result = await pool.query(
    `
    DELETE FROM boons
    WHERE id = $1
    RETURNING id
    `,
    [boonId],
  );

  return result.rows[0] || null;
}

async function upsertBoonAutomation(
  client,
  {
    automationEntryId = null,
    boonId,
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
        boon_id = $2,
        panel_title = $3,
        panel_subtitle = $4,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        boon_id,
        panel_title,
        panel_subtitle,
        sort_order
      `,
      [automationEntryId, boonId, panelTitle, panelSubtitle],
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
        boon_id,
        anchor_mode,
        panel_title,
        panel_subtitle,
        sort_order
      )
      VALUES ($1, 'boon', $2, $3, 0)
      RETURNING
        id,
        boon_id,
        panel_title,
        panel_subtitle,
        sort_order
      `,
      [boonId, panelTitle, panelSubtitle],
    );
  }

  const automationEntry = mapBoonAutomationRow(automationEntryResult.rows[0]);

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

async function createBoonAutomation({
  boonId,
  panelTitle,
  panelSubtitle,
  setupCommands,
  codeBlocks,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const automationEntry = await upsertBoonAutomation(client, {
      boonId,
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

async function updateBoonAutomation({
  automationEntryId,
  boonId,
  panelTitle,
  panelSubtitle,
  setupCommands,
  codeBlocks,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const automationEntry = await upsertBoonAutomation(client, {
      automationEntryId,
      boonId,
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

async function deleteBoonAutomation(automationEntryId) {
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
  createBoon,
  createBoonAutomation,
  deleteBoon,
  deleteBoonAutomation,
  listBoons,
  updateBoon,
  updateBoonAutomation,
};
