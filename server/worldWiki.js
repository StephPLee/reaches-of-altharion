const { pool } = require("./db");

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

async function ensureUniqueSlug(baseSlug, table) {
  const base = baseSlug || "page";
  let candidate = base;
  let suffix = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await pool.query(
      `SELECT 1 FROM ${table} WHERE slug = $1`,
      [candidate],
    );
    if (result.rowCount === 0) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function mapCategoryRow(row) {
  return row
    ? {
        id: row.id,
        slug: row.slug,
        name: row.name,
        sortOrder: row.sort_order,
      }
    : null;
}

function mapPageRow(row) {
  if (!row) {
    return null;
  }

  return {
    slug: row.slug,
    title: row.title,
    markdown: row.markdown,
    category:
      row.category_id != null
        ? {
            id: row.category_id,
            slug: row.category_slug,
            name: row.category_name,
          }
        : null,
    coverImagePath: row.cover_image_path,
    attributes: Array.isArray(row.attributes) ? row.attributes : [],
    isDraft: row.is_draft,
    gmOnly: row.gm_only,
    updatedAt: row.updated_at,
  };
}

function mapImageRow(row) {
  return row
    ? {
        fileName: row.file_name,
        originalName: row.original_name,
        url: `/uploads/world-wiki/${row.file_name}`,
        createdAt: row.created_at,
      }
    : null;
}

const PAGE_SELECT = `
  SELECT
    p.slug,
    p.title,
    p.markdown,
    p.cover_image_path,
    p.attributes,
    p.is_draft,
    p.gm_only,
    p.updated_at,
    c.id AS category_id,
    c.slug AS category_slug,
    c.name AS category_name
  FROM world_wiki_pages p
  LEFT JOIN world_wiki_categories c ON c.id = p.category_id
`;

async function listCategories() {
  const result = await pool.query(
    `SELECT id, slug, name, sort_order FROM world_wiki_categories ORDER BY sort_order ASC, LOWER(name) ASC`,
  );
  return result.rows.map(mapCategoryRow);
}

async function createCategory({ name, sortOrder }) {
  const slug = await ensureUniqueSlug(slugify(name), "world_wiki_categories");
  const result = await pool.query(
    `
    INSERT INTO world_wiki_categories (slug, name, sort_order)
    VALUES ($1, $2, $3)
    RETURNING id, slug, name, sort_order
    `,
    [slug, name.trim().slice(0, 120), Number.isFinite(sortOrder) ? sortOrder : 0],
  );
  return mapCategoryRow(result.rows[0]);
}

async function updateCategory({ categoryId, name, sortOrder }) {
  const result = await pool.query(
    `
    UPDATE world_wiki_categories
    SET
      name = COALESCE($2, name),
      sort_order = COALESCE($3, sort_order),
      updated_at = NOW()
    WHERE id = $1
    RETURNING id, slug, name, sort_order
    `,
    [categoryId, name ? name.trim().slice(0, 120) : null, sortOrder ?? null],
  );
  return mapCategoryRow(result.rows[0]);
}

async function deleteCategory(categoryId) {
  const result = await pool.query(
    `DELETE FROM world_wiki_categories WHERE id = $1`,
    [categoryId],
  );
  return result.rowCount > 0;
}

async function listPages({ includeDrafts = false, includeGmOnly = false, search = "" } = {}) {
  const conditions = [];
  const params = [];

  if (!includeDrafts) {
    conditions.push("p.is_draft = false");
  }
  if (!includeGmOnly) {
    conditions.push("p.gm_only = false");
  }
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conditions.push(`(LOWER(p.title) LIKE $${params.length} OR LOWER(p.markdown) LIKE $${params.length})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await pool.query(
    `${PAGE_SELECT} ${whereClause} ORDER BY p.updated_at DESC`,
    params,
  );
  return result.rows.map(mapPageRow);
}

async function getPageBySlug(slug) {
  const result = await pool.query(`${PAGE_SELECT} WHERE p.slug = $1`, [slug]);
  return mapPageRow(result.rows[0]);
}

async function createPage({
  title,
  markdown,
  categoryId,
  coverImagePath,
  attributes,
  isDraft,
  gmOnly,
  createdByUserId,
}) {
  const slug = await ensureUniqueSlug(slugify(title), "world_wiki_pages");

  const result = await pool.query(
    `
    INSERT INTO world_wiki_pages (
      slug, title, markdown, category_id, cover_image_path, attributes,
      is_draft, gm_only, created_by_user_id, updated_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
    RETURNING slug
    `,
    [
      slug,
      title.trim().slice(0, 200),
      markdown,
      categoryId || null,
      coverImagePath || null,
      JSON.stringify(attributes || []),
      Boolean(isDraft),
      Boolean(gmOnly),
      createdByUserId || null,
    ],
  );

  return getPageBySlug(result.rows[0].slug);
}

async function updatePage({
  slug,
  title,
  markdown,
  categoryId,
  coverImagePath,
  attributes,
  isDraft,
  gmOnly,
  updatedByUserId,
}) {
  const result = await pool.query(
    `
    UPDATE world_wiki_pages
    SET
      title = $2,
      markdown = $3,
      category_id = $4,
      cover_image_path = $5,
      attributes = $6,
      is_draft = $7,
      gm_only = $8,
      updated_by_user_id = $9,
      updated_at = NOW()
    WHERE slug = $1
    RETURNING slug
    `,
    [
      slug,
      title.trim().slice(0, 200),
      markdown,
      categoryId || null,
      coverImagePath || null,
      JSON.stringify(attributes || []),
      Boolean(isDraft),
      Boolean(gmOnly),
      updatedByUserId || null,
    ],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return getPageBySlug(slug);
}

async function deletePage(slug) {
  const result = await pool.query(`DELETE FROM world_wiki_pages WHERE slug = $1`, [slug]);
  return result.rowCount > 0;
}

async function listImages() {
  const result = await pool.query(
    `SELECT file_name, original_name, created_at FROM world_wiki_images ORDER BY created_at DESC`,
  );
  return result.rows.map(mapImageRow);
}

async function recordImage({ fileName, originalName, uploadedByUserId }) {
  const result = await pool.query(
    `
    INSERT INTO world_wiki_images (file_name, original_name, uploaded_by_user_id)
    VALUES ($1, $2, $3)
    RETURNING file_name, original_name, created_at
    `,
    [fileName, originalName.slice(0, 255), uploadedByUserId || null],
  );
  return mapImageRow(result.rows[0]);
}

async function deleteImageRecord(fileName) {
  const result = await pool.query(
    `DELETE FROM world_wiki_images WHERE file_name = $1`,
    [fileName],
  );
  return result.rowCount > 0;
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listPages,
  getPageBySlug,
  createPage,
  updatePage,
  deletePage,
  listImages,
  recordImage,
  deleteImageRecord,
};
