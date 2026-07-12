const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const pool = require("../db");

const BUMP_DEBOUNCE_MS = 3000;
const pendingBumps = new Map(); // discordChannelId → Timeout
const recentlyPostedMessageIds = new Set(); // discordMessageId, to avoid re-triggering on our own repost

function formatStickyContent(content) {
  return `__**Stickied Message:**__\n\n${content}`;
}

function buildStickyModal(channelId, prefillContent = "") {
  const modal = new ModalBuilder()
    .setCustomId(`sticky-modal:${channelId}`)
    .setTitle("Set sticky message");

  const contentInput = new TextInputBuilder()
    .setCustomId("sticky-content")
    .setLabel("Sticky message")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1950);
  if (prefillContent) contentInput.setValue(prefillContent.slice(0, 1950));

  modal.addComponents(new ActionRowBuilder().addComponents(contentInput));
  return modal;
}

async function getStickyMessage(channelId) {
  const result = await pool.query(
    "SELECT * FROM sticky_messages WHERE discord_channel_id = $1",
    [channelId],
  );
  return result.rows[0] ?? null;
}

async function setStickyMessage({ channelId, content, createdByDiscordUserId }) {
  const result = await pool.query(
    `
    INSERT INTO sticky_messages (discord_channel_id, content, created_by_discord_user_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (discord_channel_id) DO UPDATE
    SET content = EXCLUDED.content, updated_at = NOW()
    RETURNING *
    `,
    [channelId, content, createdByDiscordUserId],
  );
  return result.rows[0];
}

async function clearStickyMessage(channelId) {
  await pool.query("DELETE FROM sticky_messages WHERE discord_channel_id = $1", [channelId]);
}

async function setStickyMessageId(channelId, messageId) {
  await pool.query(
    "UPDATE sticky_messages SET discord_message_id = $2, updated_at = NOW() WHERE discord_channel_id = $1",
    [channelId, messageId],
  );
}

async function postSticky(channel, sticky) {
  if (sticky.discord_message_id) {
    try {
      await channel.messages.delete(sticky.discord_message_id);
    } catch {
      // Already deleted or inaccessible; nothing to clean up.
    }
  }

  const posted = await channel.send({
    content: formatStickyContent(sticky.content),
    allowedMentions: { parse: [] },
  });

  recentlyPostedMessageIds.add(posted.id);
  setTimeout(() => recentlyPostedMessageIds.delete(posted.id), 10_000);

  await setStickyMessageId(channel.id, posted.id);
  return posted;
}

function scheduleBump(client, channelId) {
  const existingTimeout = pendingBumps.get(channelId);
  if (existingTimeout) clearTimeout(existingTimeout);

  const timeout = setTimeout(async () => {
    pendingBumps.delete(channelId);
    try {
      const sticky = await getStickyMessage(channelId);
      if (!sticky) return;

      const channel = await client.channels.fetch(channelId);
      if (!channel?.send) return;

      await postSticky(channel, sticky);
    } catch (error) {
      console.error("Failed to bump sticky message:", { channelId, error });
    }
  }, BUMP_DEBOUNCE_MS);

  pendingBumps.set(channelId, timeout);
}

async function handleMessageForSticky(client, message) {
  if (!message.guildId) return;
  if (recentlyPostedMessageIds.has(message.id)) return;

  const sticky = await getStickyMessage(message.channelId);
  if (!sticky) return;

  scheduleBump(client, message.channelId);
}

module.exports = {
  buildStickyModal,
  clearStickyMessage,
  formatStickyContent,
  getStickyMessage,
  handleMessageForSticky,
  postSticky,
  setStickyMessage,
};
