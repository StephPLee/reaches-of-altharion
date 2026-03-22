const { pool } = require("./db");

function mapStartingGraceRow(row) {
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

function mapStartingGraceAutomationRow(row) {
  return {
    id: Number(row.id),
    startingGraceId: row.starting_grace_id
      ? Number(row.starting_grace_id)
      : null,
    panelTitle: row.panel_title,
    panelSubtitle: row.panel_subtitle,
    sortOrder: row.sort_order,
    setupCommands: [],
    codeBlocks: [],
  };
}

async function listStartingGraces() {
  const gracesResult = await pool.query(
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
    FROM starting_graces
    WHERE is_published = true
    ORDER BY LOWER(title) ASC, id ASC
    `,
  );

  const graces = gracesResult.rows.map(mapStartingGraceRow);

  if (graces.length === 0) {
    return [];
  }

  const graceIds = graces.map((grace) => grace.id);
  const automationEntriesResult = await pool.query(
    `
    SELECT
      id,
      starting_grace_id,
      panel_title,
      panel_subtitle,
      sort_order
    FROM homebrew_automation_entries
    WHERE starting_grace_id = ANY($1::bigint[])
    ORDER BY starting_grace_id ASC, sort_order ASC, id ASC
    `,
    [graceIds],
  );

  const automationEntries = automationEntriesResult.rows.map(
    mapStartingGraceAutomationRow,
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

  const gracesById = new Map(graces.map((grace) => [grace.id, grace]));

  for (const automationEntry of automationEntries) {
    automationEntry.setupCommands =
      setupCommandsByAutomationId.get(automationEntry.id) ?? [];
    automationEntry.codeBlocks =
      codeBlocksByAutomationId.get(automationEntry.id) ?? [];

    if (automationEntry.startingGraceId) {
      gracesById
        .get(automationEntry.startingGraceId)
        ?.automationEntries.push(automationEntry);
    }
  }

  return graces;
}

async function createStartingGrace({
  title,
  slug,
  contentMarkdown,
  sortOrder,
  isPublished,
  createdByUserId,
}) {
  const result = await pool.query(
    `
    INSERT INTO starting_graces (
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

  return mapStartingGraceRow(result.rows[0]);
}

async function updateStartingGrace({
  graceId,
  title,
  slug,
  contentMarkdown,
  sortOrder,
  isPublished,
  updatedByUserId,
}) {
  const result = await pool.query(
    `
    UPDATE starting_graces
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
      graceId,
      title,
      slug,
      contentMarkdown,
      sortOrder,
      isPublished,
      updatedByUserId,
    ],
  );

  return result.rows[0] ? mapStartingGraceRow(result.rows[0]) : null;
}

async function deleteStartingGrace(graceId) {
  const result = await pool.query(
    `
    DELETE FROM starting_graces
    WHERE id = $1
    RETURNING id
    `,
    [graceId],
  );

  return result.rows[0] || null;
}

async function upsertStartingGraceAutomation(
  client,
  {
    automationEntryId = null,
    startingGraceId,
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
        starting_grace_id = $2,
        panel_title = $3,
        panel_subtitle = $4,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        starting_grace_id,
        panel_title,
        panel_subtitle,
        sort_order
      `,
      [automationEntryId, startingGraceId, panelTitle, panelSubtitle],
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
        starting_grace_id,
        anchor_mode,
        panel_title,
        panel_subtitle,
        sort_order
      )
      VALUES ($1, 'starting_grace', $2, $3, 0)
      RETURNING
        id,
        starting_grace_id,
        panel_title,
        panel_subtitle,
        sort_order
      `,
      [startingGraceId, panelTitle, panelSubtitle],
    );
  }

  const automationEntry = mapStartingGraceAutomationRow(
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

async function createStartingGraceAutomation({
  startingGraceId,
  panelTitle,
  panelSubtitle,
  setupCommands,
  codeBlocks,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const automationEntry = await upsertStartingGraceAutomation(client, {
      startingGraceId,
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

async function updateStartingGraceAutomation({
  automationEntryId,
  startingGraceId,
  panelTitle,
  panelSubtitle,
  setupCommands,
  codeBlocks,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const automationEntry = await upsertStartingGraceAutomation(client, {
      automationEntryId,
      startingGraceId,
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

async function deleteStartingGraceAutomation(automationEntryId) {
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
  createStartingGrace,
  createStartingGraceAutomation,
  deleteStartingGrace,
  deleteStartingGraceAutomation,
  listStartingGraces,
  updateStartingGrace,
  updateStartingGraceAutomation,
};
