const { pool } = require("./db");

function mapHomebrewEntryRow(row) {
  return {
    id: Number(row.id),
    section: row.section,
    title: row.title,
    slug: row.slug,
    bodyMarkdown: row.body_markdown,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: [],
    automationEntries: [],
  };
}

function mapHomebrewSectionItemRow(row) {
  return {
    id: Number(row.id),
    homebrewEntryId: Number(row.homebrew_entry_id),
    parentItemId: row.parent_item_id ? Number(row.parent_item_id) : null,
    label: row.label,
    href: row.href,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    automationEntries: [],
    children: [],
  };
}

function mapAutomationEntryRow(row) {
  return {
    id: Number(row.id),
    homebrewEntryId: Number(row.homebrew_entry_id),
    homebrewSectionItemId: row.homebrew_section_item_id
      ? Number(row.homebrew_section_item_id)
      : null,
    anchorMode: row.anchor_mode,
    headingSelector: row.heading_selector,
    headingText: row.heading_text,
    href: row.href,
    linkText: row.link_text,
    panelTitle: row.panel_title,
    panelSubtitle: row.panel_subtitle,
    sortOrder: row.sort_order,
    setupCommands: [],
    codeBlocks: [],
  };
}

async function listHomebrewEntriesBySection(section) {
  const entriesResult = await pool.query(
    `
    SELECT
      id,
      section,
      title,
      slug,
      body_markdown,
      sort_order,
      is_published,
      created_at,
      updated_at
    FROM homebrew_entries
    WHERE section = $1
      AND is_published = true
    ORDER BY sort_order ASC, id ASC
    `,
    [section],
  );

  const entries = entriesResult.rows.map(mapHomebrewEntryRow);

  if (entries.length === 0) {
    return [];
  }

  const entryIds = entries.map((entry) => entry.id);
  const itemsResult = await pool.query(
    `
    SELECT
      id,
      homebrew_entry_id,
      parent_item_id,
      label,
      href,
      sort_order,
      is_published,
      created_at,
      updated_at
    FROM homebrew_section_items
    WHERE homebrew_entry_id = ANY($1::bigint[])
      AND is_published = true
    ORDER BY homebrew_entry_id ASC, LOWER(label) ASC, id ASC
    `,
    [entryIds],
  );

  const automationEntriesResult = await pool.query(
    `
    SELECT
      id,
      homebrew_entry_id,
      homebrew_section_item_id,
      anchor_mode,
      heading_selector,
      heading_text,
      href,
      link_text,
      panel_title,
      panel_subtitle,
      sort_order
    FROM homebrew_automation_entries
    WHERE homebrew_entry_id = ANY($1::bigint[])
    ORDER BY homebrew_entry_id ASC, sort_order ASC, id ASC
    `,
    [entryIds],
  );

  const automationEntries = automationEntriesResult.rows.map(
    mapAutomationEntryRow,
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

  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  const items = itemsResult.rows.map(mapHomebrewSectionItemRow);
  const itemsById = new Map(items.map((item) => [item.id, item]));

  for (const item of items) {
    if (item.parentItemId) {
      const parentItem = itemsById.get(item.parentItemId);

      if (parentItem) {
        parentItem.children.push(item);
      }

      continue;
    }

    const parentEntry = entriesById.get(item.homebrewEntryId);

    if (parentEntry) {
      parentEntry.items.push(item);
    }
  }

  function sortItemsAlphabetically(itemList) {
    itemList.sort((left, right) =>
      left.label.localeCompare(right.label, undefined, { sensitivity: "base" }),
    );

    for (const item of itemList) {
      if (item.children.length > 0) {
        sortItemsAlphabetically(item.children);
      }
    }
  }

  for (const entry of entries) {
    sortItemsAlphabetically(entry.items);
  }

  for (const automationEntry of automationEntries) {
    automationEntry.setupCommands =
      setupCommandsByAutomationId.get(automationEntry.id) ?? [];
    automationEntry.codeBlocks =
      codeBlocksByAutomationId.get(automationEntry.id) ?? [];
    const parentItem = automationEntry.homebrewSectionItemId
      ? itemsById.get(automationEntry.homebrewSectionItemId)
      : null;

    if (parentItem) {
      parentItem.automationEntries.push(automationEntry);
      continue;
    }

    const parentEntry = entriesById.get(automationEntry.homebrewEntryId);

    if (parentEntry) {
      parentEntry.automationEntries.push(automationEntry);
    }
  }

  return entries;
}

async function createHomebrewEntry({
  section,
  title,
  slug,
  bodyMarkdown,
  sortOrder,
  isPublished,
  createdByUserId,
}) {
  const result = await pool.query(
    `
    INSERT INTO homebrew_entries (
      section,
      title,
      slug,
      body_markdown,
      sort_order,
      is_published,
      created_by_user_id,
      updated_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
    RETURNING
      id,
      section,
      title,
      slug,
      body_markdown,
      sort_order,
      is_published,
      created_at,
      updated_at
    `,
    [
      section,
      title,
      slug,
      bodyMarkdown,
      sortOrder,
      isPublished,
      createdByUserId,
    ],
  );

  return mapHomebrewEntryRow(result.rows[0]);
}

async function createHomebrewSectionItem({
  homebrewEntryId,
  parentItemId,
  label,
  href,
  sortOrder,
  isPublished,
  createdByUserId,
}) {
  const result = await pool.query(
    `
    INSERT INTO homebrew_section_items (
      homebrew_entry_id,
      parent_item_id,
      label,
      href,
      sort_order,
      is_published,
      created_by_user_id,
      updated_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
    RETURNING
      id,
      homebrew_entry_id,
      parent_item_id,
      label,
      href,
      sort_order,
      is_published,
      created_at,
      updated_at
    `,
    [
      homebrewEntryId,
      parentItemId,
      label,
      href,
      sortOrder,
      isPublished,
      createdByUserId,
    ],
  );

  return mapHomebrewSectionItemRow(result.rows[0]);
}

async function updateHomebrewSectionItem({
  itemId,
  parentItemId,
  label,
  href,
  updatedByUserId,
}) {
  const result = await pool.query(
    `
    UPDATE homebrew_section_items
    SET
      parent_item_id = $2,
      label = $3,
      href = $4,
      updated_by_user_id = $5,
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      homebrew_entry_id,
      parent_item_id,
      label,
      href,
      sort_order,
      is_published,
      created_at,
      updated_at
    `,
    [itemId, parentItemId, label, href, updatedByUserId],
  );

  return result.rows[0] ? mapHomebrewSectionItemRow(result.rows[0]) : null;
}

async function deleteHomebrewSectionItem(itemId) {
  const result = await pool.query(
    `
    DELETE FROM homebrew_section_items
    WHERE id = $1
    RETURNING id
    `,
    [itemId],
  );

  return result.rows[0] || null;
}

async function createHomebrewItemAutomation({
  homebrewEntryId,
  homebrewSectionItemId,
  panelTitle,
  panelSubtitle,
  setupCommands,
  codeBlocks,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const automationEntry = await upsertHomebrewItemAutomation(client, {
      homebrewEntryId,
      homebrewSectionItemId,
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

async function upsertHomebrewItemAutomation(
  client,
  {
    automationEntryId = null,
    homebrewEntryId,
    homebrewSectionItemId,
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
        homebrew_entry_id = $2,
        homebrew_section_item_id = $3,
        panel_title = $4,
        panel_subtitle = $5,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        homebrew_entry_id,
        homebrew_section_item_id,
        anchor_mode,
        heading_selector,
        heading_text,
        href,
        link_text,
        panel_title,
        panel_subtitle,
        sort_order
      `,
      [
        automationEntryId,
        homebrewEntryId,
        homebrewSectionItemId,
        panelTitle,
        panelSubtitle,
      ],
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
        homebrew_entry_id,
        homebrew_section_item_id,
        anchor_mode,
        panel_title,
        panel_subtitle,
        sort_order
      )
      VALUES ($1, $2, 'item', $3, $4, 0)
      RETURNING
        id,
        homebrew_entry_id,
        homebrew_section_item_id,
        anchor_mode,
        heading_selector,
        heading_text,
        href,
        link_text,
        panel_title,
        panel_subtitle,
        sort_order
      `,
      [homebrewEntryId, homebrewSectionItemId, panelTitle, panelSubtitle],
    );
  }

  const automationEntry = mapAutomationEntryRow(automationEntryResult.rows[0]);
  automationEntry.setupCommands = [];
  automationEntry.codeBlocks = [];

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

async function updateHomebrewItemAutomation({
  automationEntryId,
  homebrewEntryId,
  homebrewSectionItemId,
  panelTitle,
  panelSubtitle,
  setupCommands,
  codeBlocks,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const automationEntry = await upsertHomebrewItemAutomation(client, {
      automationEntryId,
      homebrewEntryId,
      homebrewSectionItemId,
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

async function deleteHomebrewItemAutomation(automationEntryId) {
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
  createHomebrewItemAutomation,
  createHomebrewEntry,
  createHomebrewSectionItem,
  deleteHomebrewItemAutomation,
  deleteHomebrewSectionItem,
  listHomebrewEntriesBySection,
  updateHomebrewItemAutomation,
  updateHomebrewSectionItem,
};
