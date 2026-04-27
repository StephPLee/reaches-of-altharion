const { EmbedBuilder } = require("discord.js");
const pool = require("../db");
const { truncateValue } = require("../utils");

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

module.exports = {
  buildFaqEmbeds,
  listFaqEntries,
};
