const { pool } = require("./db");

const WIKI_PAGE_SLUGS = new Set([
  "getting-set-up",
  "dm-rules",
  "homebrew-guidelines",
  "rp-rules",
]);

function isAllowedWikiPageSlug(slug) {
  return typeof slug === "string" && WIKI_PAGE_SLUGS.has(slug);
}

function mapWikiPageRow(row) {
  return row
    ? {
        slug: row.slug,
        title: row.title,
        markdown: row.markdown,
        updatedAt: row.updated_at,
      }
    : null;
}

async function getWikiPage(slug) {
  const result = await pool.query(
    `
    SELECT slug, title, markdown, updated_at
    FROM wiki_pages
    WHERE slug = $1
    `,
    [slug],
  );

  return mapWikiPageRow(result.rows[0]);
}

async function upsertWikiPage({ slug, title, markdown, updatedByUserId }) {
  const result = await pool.query(
    `
    INSERT INTO wiki_pages (slug, title, markdown, updated_by_user_id)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (slug) DO UPDATE
    SET
      title = EXCLUDED.title,
      markdown = EXCLUDED.markdown,
      updated_by_user_id = EXCLUDED.updated_by_user_id,
      updated_at = NOW()
    RETURNING slug, title, markdown, updated_at
    `,
    [slug, title, markdown, updatedByUserId || null],
  );

  return mapWikiPageRow(result.rows[0]);
}

module.exports = {
  getWikiPage,
  isAllowedWikiPageSlug,
  upsertWikiPage,
};
