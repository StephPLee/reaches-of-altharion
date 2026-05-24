const { pool } = require("./db");

const ALLOWED_APPLIES_TO = new Set(["attack", "spell", "save", "check"]);

function mapRow(row) {
  return {
    id: String(row.id),
    name: row.name,
    appliesTo: row.applies_to || [],
    bonus: row.bonus || "",
    damage: row.damage || "",
    phrase: row.phrase || "",
    rawFlags: row.raw_flags || "",
  };
}

function normalizeModifierPayload(payload) {
  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  if (!name) {
    return { error: "Modifier name is required." };
  }

  const appliesTo = Array.isArray(payload.appliesTo)
    ? payload.appliesTo
        .map((entry) => String(entry).trim())
        .filter((entry) => ALLOWED_APPLIES_TO.has(entry))
    : [];

  if (!appliesTo.length) {
    return { error: "Select at least one command type." };
  }

  return {
    name: name.slice(0, 120),
    appliesTo,
    bonus: typeof payload.bonus === "string" ? payload.bonus.trim().slice(0, 120) : "",
    damage: typeof payload.damage === "string" ? payload.damage.trim().slice(0, 160) : "",
    phrase: typeof payload.phrase === "string" ? payload.phrase.trim().slice(0, 240) : "",
    rawFlags: typeof payload.rawFlags === "string" ? payload.rawFlags.trim().slice(0, 240) : "",
  };
}

async function listSavedAvraeModifiers(userId) {
  const result = await pool.query(
    `
    SELECT id, name, applies_to, bonus, damage, phrase, raw_flags
    FROM avrae_saved_modifiers
    WHERE user_id = $1
    ORDER BY LOWER(name) ASC, id ASC
    `,
    [userId],
  );

  return result.rows.map(mapRow);
}

async function createSavedAvraeModifier({ userId, modifier }) {
  const result = await pool.query(
    `
    INSERT INTO avrae_saved_modifiers (
      user_id,
      name,
      applies_to,
      bonus,
      damage,
      phrase,
      raw_flags,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING id, name, applies_to, bonus, damage, phrase, raw_flags
    `,
    [
      userId,
      modifier.name,
      modifier.appliesTo,
      modifier.bonus,
      modifier.damage,
      modifier.phrase,
      modifier.rawFlags,
    ],
  );

  return mapRow(result.rows[0]);
}

async function updateSavedAvraeModifier({ userId, modifierId, modifier }) {
  const result = await pool.query(
    `
    UPDATE avrae_saved_modifiers
    SET
      name = $3,
      applies_to = $4,
      bonus = $5,
      damage = $6,
      phrase = $7,
      raw_flags = $8,
      updated_at = NOW()
    WHERE user_id = $1
      AND id = $2
    RETURNING id, name, applies_to, bonus, damage, phrase, raw_flags
    `,
    [
      userId,
      modifierId,
      modifier.name,
      modifier.appliesTo,
      modifier.bonus,
      modifier.damage,
      modifier.phrase,
      modifier.rawFlags,
    ],
  );

  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

async function deleteSavedAvraeModifier({ userId, modifierId }) {
  const result = await pool.query(
    `
    DELETE FROM avrae_saved_modifiers
    WHERE user_id = $1
      AND id = $2
    `,
    [userId, modifierId],
  );

  return result.rowCount > 0;
}

module.exports = {
  createSavedAvraeModifier,
  deleteSavedAvraeModifier,
  listSavedAvraeModifiers,
  normalizeModifierPayload,
  updateSavedAvraeModifier,
};

