const { pool } = require("./db");

const RULE_TYPES = new Set([
  "final_participant_fixed",
  "sc_percentage",
  "event_quest_fixed",
]);

function mapEvent(row) {
  return row
    ? {
        id: Number(row.id),
        name: row.name,
        currencyId: row.currency_id,
        currencyName: row.currency_name,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        ruleType: row.rule_type,
        fixedAmount: Number(row.fixed_amount),
        nonEventScPercent: Number(row.non_event_sc_percent),
        eventScPercent: Number(row.event_sc_percent),
        enabled: row.enabled,
        calendarEventId: row.calendar_event_id ? Number(row.calendar_event_id) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    : null;
}

function normalizeEventInput(value) {
  const name = typeof value?.name === "string" ? value.name.trim() : "";
  const currencyId = typeof value?.currencyId === "string" ? value.currencyId.trim() : "";
  const currencyName = typeof value?.currencyName === "string" ? value.currencyName.trim() : "";
  const startsAt = new Date(value?.startsAt);
  const endsAt = new Date(value?.endsAt);
  const ruleType = typeof value?.ruleType === "string" ? value.ruleType : "";
  const fixedAmount = Number(value?.fixedAmount ?? 0);
  const nonEventScPercent = Number(value?.nonEventScPercent ?? 0);
  const eventScPercent = Number(value?.eventScPercent ?? 0);
  const calendarStartDate = /^\d{4}-\d{2}-\d{2}$/.test(value?.calendarStartDate || "")
    ? value.calendarStartDate
    : Number.isFinite(startsAt.getTime())
      ? startsAt.toISOString().slice(0, 10)
      : "";
  const calendarEndDate = /^\d{4}-\d{2}-\d{2}$/.test(value?.calendarEndDate || "")
    ? value.calendarEndDate
    : Number.isFinite(endsAt.getTime())
      ? endsAt.toISOString().slice(0, 10)
      : "";

  if (!name || !currencyId || !currencyName) {
    return { error: "Event name, currency name, and currency ID are required." };
  }
  if (!RULE_TYPES.has(ruleType)) {
    return { error: "Choose a supported event reward rule." };
  }
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) {
    return { error: "Choose a valid event start and end time." };
  }
  if (![fixedAmount, nonEventScPercent, eventScPercent].every(Number.isInteger) || [fixedAmount, nonEventScPercent, eventScPercent].some((entry) => entry < 0)) {
    return { error: "Reward amounts and percentages must be non-negative whole numbers." };
  }
  if ((ruleType === "event_quest_fixed" || ruleType === "final_participant_fixed") && fixedAmount === 0) {
    return { error: "Fixed event reward amounts must be greater than zero." };
  }
  if (ruleType === "sc_percentage" && nonEventScPercent === 0 && eventScPercent === 0) {
    return { error: "At least one SC percentage must be greater than zero." };
  }

  return {
    name,
    currencyId,
    currencyName,
    startsAt,
    endsAt,
    ruleType,
    fixedAmount,
    nonEventScPercent,
    eventScPercent,
    enabled: value?.enabled !== false,
    calendarStartDate,
    calendarEndDate,
  };
}

async function assertNoEnabledOverlap(client, event, excludedId = null) {
  if (!event.enabled) return;
  const result = await client.query(
    `SELECT id, name FROM reward_events
     WHERE enabled = TRUE
       AND ($1::bigint IS NULL OR id <> $1)
       AND starts_at < $3
       AND ends_at > $2
     LIMIT 1`,
    [excludedId, event.startsAt, event.endsAt],
  );
  if (result.rows[0]) {
    const error = new Error(`This overlaps enabled event “${result.rows[0].name}”.`);
    error.code = "event_overlap";
    throw error;
  }
}

async function listRewardEvents() {
  const result = await pool.query(`SELECT * FROM reward_events ORDER BY starts_at DESC, id DESC`);
  return result.rows.map(mapEvent);
}

async function getRewardEvent(id) {
  const result = await pool.query(`SELECT * FROM reward_events WHERE id = $1`, [id]);
  return mapEvent(result.rows[0]);
}

async function getActiveRewardEvent(at = new Date()) {
  const result = await pool.query(
    `SELECT * FROM reward_events
     WHERE enabled = TRUE AND starts_at <= $1 AND ends_at > $1
     ORDER BY starts_at DESC LIMIT 1`,
    [at],
  );
  return mapEvent(result.rows[0]);
}

function describeEventRule(event) {
  if (event.ruleType === "final_participant_fixed") {
    return `${event.fixedAmount} ${event.currencyName} to each unique event-quest participant at the final payout.`;
  }
  if (event.ruleType === "sc_percentage") {
    return `${event.nonEventScPercent}% of SC for normal quests and ${event.eventScPercent}% for event quests, paid as ${event.currencyName}.`;
  }
  return `${event.fixedAmount} ${event.currencyName} per event quest.`;
}

async function insertCalendarEvent(client, event, userId, slugSuffix) {
  const result = await client.query(
    `INSERT INTO calendar_events
     (title, slug, start_date, end_date, category, summary, details,
      is_published, created_by_user_id, updated_by_user_id)
     VALUES ($1,$2,$3,$4,'Server Event',$5,$6,TRUE,$7,$7)
     RETURNING id`,
    [
      event.name,
      `reward-event-${slugSuffix}`,
      event.calendarStartDate,
      event.calendarEndDate,
      describeEventRule(event),
      `Event currency: ${event.currencyName}. ${describeEventRule(event)}`,
      userId || null,
    ],
  );
  return Number(result.rows[0].id);
}

async function createRewardEvent(input, createdByDiscordUserId, createdByUserId) {
  const event = normalizeEventInput(input);
  if (event.error) return event;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertNoEnabledOverlap(client, event);
    const result = await client.query(
      `INSERT INTO reward_events
       (name, currency_id, currency_name, starts_at, ends_at, rule_type,
        fixed_amount, non_event_sc_percent, event_sc_percent, enabled, created_by_discord_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [event.name, event.currencyId, event.currencyName, event.startsAt, event.endsAt,
       event.ruleType, event.fixedAmount, event.nonEventScPercent,
       event.eventScPercent, event.enabled, createdByDiscordUserId || null],
    );
    const rewardEventId = Number(result.rows[0].id);
    const calendarEventId = await insertCalendarEvent(
      client,
      event,
      createdByUserId,
      rewardEventId,
    );
    const linked = await client.query(
      `UPDATE reward_events SET calendar_event_id=$2 WHERE id=$1 RETURNING *`,
      [rewardEventId, calendarEventId],
    );
    await client.query("COMMIT");
    return mapEvent(linked.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
async function updateRewardEvent(id, input, updatedByUserId) {
  const event = normalizeEventInput(input);
  if (event.error) return event;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertNoEnabledOverlap(client, event, id);
    const result = await client.query(
      `UPDATE reward_events SET name=$2, currency_id=$3, currency_name=$4,
       starts_at=$5, ends_at=$6, rule_type=$7, fixed_amount=$8,
       non_event_sc_percent=$9, event_sc_percent=$10, enabled=$11, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [id, event.name, event.currencyId, event.currencyName, event.startsAt,
       event.endsAt, event.ruleType, event.fixedAmount, event.nonEventScPercent,
       event.eventScPercent, event.enabled],
    );
    if (!result.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    let calendarEventId = result.rows[0].calendar_event_id
      ? Number(result.rows[0].calendar_event_id)
      : null;
    if (calendarEventId) {
      const calendarResult = await client.query(
        `UPDATE calendar_events SET title=$2, start_date=$3, end_date=$4,
         category='Server Event', summary=$5, details=$6,
         updated_by_user_id=$7, updated_at=NOW()
         WHERE id=$1 RETURNING id`,
        [calendarEventId, event.name, event.calendarStartDate,
         event.calendarEndDate, describeEventRule(event),
         `Event currency: ${event.currencyName}. ${describeEventRule(event)}`,
         updatedByUserId || null],
      );
      if (!calendarResult.rows[0]) calendarEventId = null;
    }
    if (!calendarEventId) {
      calendarEventId = await insertCalendarEvent(
        client,
        event,
        updatedByUserId,
        id,
      );
    }
    const linked = await client.query(
      `UPDATE reward_events SET calendar_event_id=$2 WHERE id=$1 RETURNING *`,
      [id, calendarEventId],
    );
    await client.query("COMMIT");
    return mapEvent(linked.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
function calculateEventCurrency(event, { eventRelated, sc }) {
  if (!event) return 0;
  if (event.ruleType === "event_quest_fixed") {
    return eventRelated ? event.fixedAmount : 0;
  }
  if (event.ruleType === "sc_percentage") {
    const percent = eventRelated ? event.eventScPercent : event.nonEventScPercent;
    return Math.floor((Math.max(0, sc) * percent) / 100);
  }
  return 0;
}

async function recordEventQuestParticipants(eventId, adventureId, characterIds) {
  if (!eventId || !adventureId || !Array.isArray(characterIds) || characterIds.length === 0) return;
  await pool.query(
    `INSERT INTO reward_event_participants (event_id, adventure_id, character_id)
     SELECT $1, $2, value FROM UNNEST($3::text[]) AS value
     ON CONFLICT DO NOTHING`,
    [eventId, adventureId, [...new Set(characterIds)]],
  );
}

async function listFinalRewardParticipants(eventId) {
  const result = await pool.query(
    `SELECT character_id,
       BOOL_OR(final_rewarded_at IS NOT NULL) AS rewarded,
       MIN(recorded_at) AS first_recorded_at
     FROM reward_event_participants WHERE event_id=$1
     GROUP BY character_id ORDER BY character_id`,
    [eventId],
  );
  return result.rows.map((row) => ({
    characterId: row.character_id,
    rewarded: row.rewarded,
    firstRecordedAt: row.first_recorded_at,
  }));
}

async function markFinalRewardsDistributed(eventId, characterIds) {
  await pool.query(
    `UPDATE reward_event_participants SET final_rewarded_at=NOW()
     WHERE event_id=$1 AND character_id=ANY($2::text[]) AND final_rewarded_at IS NULL`,
    [eventId, characterIds],
  );
}

module.exports = {
  calculateEventCurrency,
  createRewardEvent,
  getActiveRewardEvent,
  getRewardEvent,
  listFinalRewardParticipants,
  listRewardEvents,
  markFinalRewardsDistributed,
  normalizeEventInput,
  recordEventQuestParticipants,
  updateRewardEvent,
};