const {
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

function buildFeedbackCommentModal(promptId) {
  const sideQuestSelect = new StringSelectMenuBuilder()
    .setCustomId("side-quest")
    .setPlaceholder("Choose one...")
    .setRequired(true)
    .addOptions(
      { label: "No, I didn't complete any side quests", value: "none" },
      ...[1, 2, 3, 4, 5].map((rating) => ({
        label: `Yes: ${"⭐".repeat(rating)} (${rating})`,
        value: String(rating),
      })),
    );

  const sideQuestLabel = new LabelBuilder()
    .setLabel("Did you complete any side quests?")
    .setDescription("If yes, how would you rate them?")
    .setStringSelectMenuComponent(sideQuestSelect);

  const commentInput = new TextInputBuilder()
    .setCustomId("comment")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(2000)
    .setPlaceholder("Anything you'd like your DM to know...");

  const commentLabel = new LabelBuilder()
    .setLabel("Suggestions or praise? (optional)")
    .setTextInputComponent(commentInput);

  return new ModalBuilder()
    .setCustomId(`dm-feedback-modal:${promptId}`)
    .setTitle("Submit feedback")
    .addLabelComponents(sideQuestLabel, commentLabel);
}

module.exports = { buildFeedbackCommentModal };
