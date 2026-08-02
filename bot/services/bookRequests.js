const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const pool = require("../db");
const { NOTES_MAX_LENGTH, TITLE_MAX_LENGTH, createBookRequest } = require("../../shared/bookRequests");

function buildBookRequestModal() {
  const titleInput = new TextInputBuilder()
    .setCustomId("title")
    .setLabel("Book Title")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(TITLE_MAX_LENGTH)
    .setPlaceholder("Xanathar's Guide to Everything");

  const notesInput = new TextInputBuilder()
    .setCustomId("notes")
    .setLabel("Why do you need it? (optional)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(NOTES_MAX_LENGTH);

  return new ModalBuilder()
    .setCustomId("book-request-modal")
    .setTitle("Request a book")
    .addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(notesInput),
    );
}

async function saveDiscordBookRequest(interaction, { title, notes }) {
  return createBookRequest(pool, {
    discordUserId: interaction.user.id,
    username: interaction.user.username,
    title,
    notes,
    source: "bot",
  });
}

module.exports = { buildBookRequestModal, saveDiscordBookRequest };
