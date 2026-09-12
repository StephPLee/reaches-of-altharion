const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

function buildFeedbackCommentModal(promptId) {
  const commentInput = new TextInputBuilder()
    .setCustomId("comment")
    .setLabel("Suggestions or praise? (optional)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(2000)
    .setPlaceholder("Anything you'd like your DM to know...");

  return new ModalBuilder()
    .setCustomId(`dm-feedback-modal:${promptId}`)
    .setTitle("Submit feedback")
    .addComponents(new ActionRowBuilder().addComponents(commentInput));
}

module.exports = { buildFeedbackCommentModal };
