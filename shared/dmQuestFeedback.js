const RATING_CATEGORY_COLUMNS = {
  storytelling: "storytelling_rating",
  pacing: "pacing_rating",
  avrae: "avrae_rating",
  enjoyment: "enjoyment_rating",
};

const RATING_CATEGORIES = [
  { key: "storytelling", label: "Storytelling & Immersion" },
  { key: "pacing", label: "Balance & Pacing" },
  { key: "avrae", label: "Rules & Avrae" },
  { key: "enjoyment", label: "Enjoyment & Inclusivity" },
];

function isValidRating(rating) {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

async function createFeedbackPrompt(pool, { adventureId, dmDiscordUserId, recipientDiscordUserId, adventureTitle, dmDisplayName }) {
  if (!adventureId || !dmDiscordUserId || !recipientDiscordUserId) return null;
  if (recipientDiscordUserId === dmDiscordUserId) return null;

  const result = await pool.query(
    `INSERT INTO dm_quest_feedback_prompts (adventure_id, dm_discord_user_id, recipient_discord_user_id, adventure_title, dm_display_name)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (adventure_id, recipient_discord_user_id) DO NOTHING
     RETURNING id, adventure_id, dm_discord_user_id, recipient_discord_user_id, status, created_at, adventure_title, dm_display_name`,
    [adventureId, dmDiscordUserId, recipientDiscordUserId, adventureTitle || null, dmDisplayName || null],
  );
  return result.rows[0] || null;
}

async function setPromptMessageRef(pool, promptId, { channelId, messageId }) {
  await pool.query(
    `UPDATE dm_quest_feedback_prompts SET dm_channel_id = $2, dm_message_id = $3 WHERE id = $1`,
    [promptId, channelId, messageId],
  );
}

async function getPrompt(pool, promptId) {
  const result = await pool.query(
    `SELECT * FROM dm_quest_feedback_prompts WHERE id = $1`,
    [promptId],
  );
  return result.rows[0] || null;
}

async function getResponse(pool, promptId) {
  const result = await pool.query(
    `SELECT * FROM dm_quest_feedback_responses WHERE prompt_id = $1`,
    [promptId],
  );
  return result.rows[0] || null;
}

async function recordRatingSelection(pool, { promptId, category, rating }) {
  const column = RATING_CATEGORY_COLUMNS[category];
  if (!column) throw new Error(`Invalid feedback category: ${category}`);
  if (!isValidRating(rating)) throw new Error("Rating must be a whole number between 1 and 5.");

  const result = await pool.query(
    `INSERT INTO dm_quest_feedback_responses (prompt_id, ${column})
     VALUES ($1, $2)
     ON CONFLICT (prompt_id) DO UPDATE SET ${column} = EXCLUDED.${column}, updated_at = NOW()
     RETURNING *`,
    [promptId, rating],
  );
  return result.rows[0];
}

async function finalizeFeedbackResponse(pool, { promptId, comment }) {
  const response = await getResponse(pool, promptId);
  if (
    !response ||
    response.storytelling_rating === null ||
    response.pacing_rating === null ||
    response.avrae_rating === null ||
    response.enjoyment_rating === null
  ) {
    const error = new Error("Please select all four ratings before submitting.");
    error.statusCode = 400;
    throw error;
  }

  const normalizedComment = typeof comment === "string" && comment.trim() ? comment.trim() : null;

  await pool.query(
    `UPDATE dm_quest_feedback_responses SET comment = $2, updated_at = NOW() WHERE prompt_id = $1`,
    [promptId, normalizedComment],
  );
  await pool.query(
    `UPDATE dm_quest_feedback_prompts SET status = 'submitted' WHERE id = $1`,
    [promptId],
  );
}

async function listDueAggregations(pool, { olderThanHours = 24 } = {}) {
  const result = await pool.query(
    `SELECT
       p.adventure_id AS "adventureId",
       p.dm_discord_user_id AS "dmDiscordUserId",
       COUNT(r.id) AS "responseCount",
       AVG(r.storytelling_rating) AS "avgStorytelling",
       AVG(r.pacing_rating) AS "avgPacing",
       AVG(r.avrae_rating) AS "avgAvrae",
       AVG(r.enjoyment_rating) AS "avgEnjoyment",
       ARRAY_REMOVE(ARRAY_AGG(NULLIF(BTRIM(r.comment), '')), NULL) AS comments
     FROM dm_quest_feedback_prompts p
     JOIN dm_quest_feedback_responses r ON r.prompt_id = p.id
     WHERE p.status = 'submitted'
       AND NOT EXISTS (
         SELECT 1 FROM dm_quest_feedback_deliveries d
         WHERE d.adventure_id = p.adventure_id AND d.dm_discord_user_id = p.dm_discord_user_id
       )
     GROUP BY p.adventure_id, p.dm_discord_user_id
     HAVING MIN(p.created_at) <= NOW() - make_interval(hours => $1::int)`,
    [olderThanHours],
  );
  return result.rows;
}

async function markAggregationDelivered(pool, { adventureId, dmDiscordUserId }) {
  await pool.query(
    `INSERT INTO dm_quest_feedback_deliveries (adventure_id, dm_discord_user_id)
     VALUES ($1, $2)
     ON CONFLICT (adventure_id, dm_discord_user_id) DO NOTHING`,
    [adventureId, dmDiscordUserId],
  );
}

function starLabel(rating) {
  return `${"⭐".repeat(rating)} (${rating})`;
}

function buildRatingSelectRow(promptId, category, selectedRating) {
  return {
    type: 1, // action row
    components: [
      {
        type: 3, // string select menu
        custom_id: `dm-feedback-select:${promptId}:${category.key}`,
        placeholder: category.label,
        options: [1, 2, 3, 4, 5].map((rating) => ({
          label: `${category.label}: ${starLabel(rating)}`,
          value: String(rating),
          default: rating === selectedRating,
        })),
      },
    ],
  };
}

function buildFeedbackPromptMessage({ promptId, selections = {}, adventureTitle, dmDisplayName }) {
  const components = RATING_CATEGORIES.map((category) =>
    buildRatingSelectRow(promptId, category, selections[category.key] || null),
  );

  components.push({
    type: 1, // action row
    components: [
      {
        type: 2, // button
        style: 3, // success
        custom_id: `dm-feedback-submit:${promptId}`,
        label: "Submit feedback",
      },
    ],
  });

  const questPhrase = adventureTitle ? `for **${adventureTitle}**` : "for a quest";
  const dmPhrase = dmDisplayName ? `**${dmDisplayName}**` : "Your DM";

  return {
    embeds: [
      {
        title: "How was your quest?",
        description:
          `You just received a reward ${questPhrase}! ${dmPhrase} would love to know how it went.\n\n` +
          "Rate each category below, then hit **Submit feedback**. Your responses are combined with everyone else's " +
          "and sent to your DM anonymously after 24 hours — they won't see who said what.",
        color: 0x5865f2,
      },
    ],
    components,
  };
}

function buildFeedbackThanksMessage() {
  return {
    embeds: [
      {
        title: "Thanks for your feedback!",
        description: "It'll be combined with everyone else's and sent to your DM anonymously in a bit.",
        color: 0x57f287,
      },
    ],
    components: [],
  };
}

function buildFeedbackSummaryMessage({ adventureId, adventureTitle, responseCount, avgStorytelling, avgPacing, avgAvrae, avgEnjoyment, comments }) {
  const formatAvg = (value) => (value === null || value === undefined ? "n/a" : `${Number(value).toFixed(1)} / 5`);
  const commentsText =
    comments.length > 0 ? comments.map((comment) => `> ${comment}`).join("\n\n") : "*No written comments this round.*";
  const questLabel = adventureTitle ? `**${adventureTitle}**` : `adventure \`${adventureId}\``;

  return {
    embeds: [
      {
        title: "Quest feedback summary",
        description:
          `Anonymous feedback from **${responseCount}** player${responseCount === 1 ? "" : "s"} for ${questLabel}.\n\n` +
          `**Storytelling & Immersion:** ${formatAvg(avgStorytelling)}\n` +
          `**Balance & Pacing:** ${formatAvg(avgPacing)}\n` +
          `**Rules & Avrae:** ${formatAvg(avgAvrae)}\n` +
          `**Enjoyment & Inclusivity:** ${formatAvg(avgEnjoyment)}\n\n` +
          `**Comments:**\n${commentsText}`,
        color: 0xfee75c,
      },
    ],
  };
}

module.exports = {
  RATING_CATEGORIES,
  RATING_CATEGORY_COLUMNS,
  createFeedbackPrompt,
  setPromptMessageRef,
  getPrompt,
  getResponse,
  recordRatingSelection,
  finalizeFeedbackResponse,
  listDueAggregations,
  markAggregationDelivered,
  buildFeedbackPromptMessage,
  buildFeedbackThanksMessage,
  buildFeedbackSummaryMessage,
};
