const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const pool = require("../db");
const config = require("../config");
const { FEEDBACK_MAX_LENGTH, submitFeedback } = require("../../shared/feedback");

function buildFeedbackModal({ anonymous }) {
  const feedbackInput = new TextInputBuilder()
    .setCustomId("feedback")
    .setLabel("What would you like us to know?")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(FEEDBACK_MAX_LENGTH)
    .setPlaceholder("Share your feedback here...");

  return new ModalBuilder()
    .setCustomId(`feedback-modal:${anonymous ? "anonymous" : "identified"}`)
    .setTitle(anonymous ? "Submit anonymous feedback" : "Submit feedback")
    .addComponents(new ActionRowBuilder().addComponents(feedbackInput));
}

async function saveDiscordFeedback(interaction, { anonymous, feedback }) {
  return submitFeedback(pool, {
    discordUserId: interaction.user.id,
    username: interaction.user.username,
    anonymous,
    feedback,
    source: "bot",
  }, {
    webhookUrl: config.googleSheetsFeedbackWebhookUrl,
    webhookSecret: config.googleSheetsFeedbackWebhookSecret,
  });
}

module.exports = { buildFeedbackModal, saveDiscordFeedback };
