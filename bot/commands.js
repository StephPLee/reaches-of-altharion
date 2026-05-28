const { REST, Routes, SlashCommandBuilder } = require("discord.js");
const config = require("./config");
const { hasDmOrRequiredRole, hasRequiredRole } = require("./permissions");

const COMMAND_DEFINITIONS = [
  {
    name: "help",
    description: "List the bot commands and what they do.",
    help: "List the bot commands and what they do.",
  },
  {
    name: "cc-link",
    description: "Get your assigned character creation campaign link.",
    help: "Get your assigned D&D Beyond character creation campaign link.",
    requiresRole: true,
  },
  {
    name: "magicitem",
    description: "Roll a random magic item from a selected rarity.",
    help: "Open a rarity dropdown and roll a random magic item.",
  },
  {
    name: "characters",
    description: "List your WestMarches.games characters.",
    help: "List your WestMarches.games characters with their class and level. Use the visibility option to share it publicly.",
    buildCommand: (command) =>
      command.addStringOption((option) =>
        option
          .setName("visibility")
          .setDescription("Who should see the character list?")
          .addChoices(
            { name: "Private", value: "private" },
            { name: "Public", value: "public" },
          ),
      ),
  },
  {
    name: "sc-character",
    description: "Set your default character for SC-only rewards.",
    help: "Choose which of your active WestMarches.games characters receives automatic SC-only rewards.",
  },
  {
    name: "approve",
    description: "Approve a homebrew link for the site.",
    help: "Staff-only. Approve a homebrew link into the site-backed homebrew lists. Pass the submission post link to auto-fill the modal.",
    requiresRole: true,
    buildCommand: (command) =>
      command.addStringOption((option) =>
        option
          .setName("submission")
          .setDescription("Discord link to the submission post — auto-fills name, homebrew URL, and thread.")
          .setMaxLength(500),
      ),
  },
  {
    name: "approve-character",
    description: "Approve a WestMarches.games character.",
    help: "DM/staff. Approve a user's unapproved character and award the approver 2 SC.",
    requiresDmOrRole: true,
    buildCommand: (command) =>
      command
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The Discord user whose character was reviewed.")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("character")
            .setDescription("Optional character name if the user has multiple pending characters.")
            .setMaxLength(100),
        ),
  },
  {
    name: "join-guild",
    description: "Join or move one of your characters to a guild.",
    help: "Choose one of your WestMarches.games characters and add or move them to a guild roster.",
  },
  {
    name: "leave-guild",
    description: "Remove one of your characters from their guild roster.",
    help: "Remove one of your WestMarches.games characters from their current guild roster.",
  },
  {
    name: "post-guild-rosters",
    description: "Post or refresh the guild roster messages.",
    help: "Staff-only. Post or refresh the per-guild roster messages in Discord.",
    requiresRole: true,
  },
  {
    name: "rp",
    description: "Track active roleplay time in this channel or thread.",
    help: "Track active roleplay time with start, pause, resume, end, and status subcommands.",
    buildCommand: (command) =>
      command
        .addSubcommand((subcommand) =>
          subcommand
            .setName("start")
            .setDescription("Start tracking active roleplay time here."),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("pause")
            .setDescription("Pause the active roleplay timer here."),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("resume")
            .setDescription("Resume the paused roleplay timer here."),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("end")
            .setDescription("End the roleplay timer here and show the total."),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("status")
            .setDescription("Show the current roleplay timer status here."),
        ),
  },
  {
    name: "boss-start",
    description: "Start a manual server boss fight.",
    help: "Staff-only. Start a manual server boss fight or count-up progress tracker.",
    requiresRole: true,
    buildCommand: (command) =>
      command
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("The boss name.")
            .setRequired(true)
            .setMaxLength(100),
        )
        .addIntegerOption((option) =>
          option
            .setName("max-hp")
            .setDescription("The boss maximum HP or finite count-up target.")
            .setMinValue(1)
            .setMaxValue(Number.MAX_SAFE_INTEGER),
        )
        .addStringOption((option) =>
          option
            .setName("mode")
            .setDescription("Whether the tracker counts down from HP or up from 0.")
            .addChoices(
              { name: "Countdown", value: "countdown" },
              { name: "Count up", value: "countup" },
            ),
        )
        .addStringOption((option) =>
          option
            .setName("target")
            .setDescription("Set to none for count-up progress with no finite target.")
            .addChoices({ name: "None", value: "none" }),
        )
        .addStringOption((option) =>
          option
            .setName("image-url")
            .setDescription("Optional public image URL for the boss embed.")
            .setMaxLength(500),
        ),
  },
  {
    name: "boss-post",
    description: "Post the active boss status message.",
    help: "Staff-only. Post a fresh public active boss status message.",
    requiresRole: true,
  },
  {
    name: "boss-damage",
    description: "Record manual damage against the active boss.",
    help: "Staff-only. Record manual damage against the active boss.",
    requiresRole: true,
    buildCommand: (command) =>
      command
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Damage dealt.")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(Number.MAX_SAFE_INTEGER),
        )
        .addIntegerOption((option) =>
          option
            .setName("quest-level")
            .setDescription("Quest level used to scale boss damage.")
            .setRequired(true)
            .setMinValue(4)
            .setMaxValue(20),
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Optional note for the damage log.")
            .setMaxLength(500),
        ),
  },
  {
    name: "boss-heal",
    description: "Restore HP to the active boss for corrections.",
    help: "Staff-only. Restore HP to the active boss for corrections.",
    requiresRole: true,
    buildCommand: (command) =>
      command
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("HP to restore.")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(Number.MAX_SAFE_INTEGER),
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Optional note for the healing log.")
            .setMaxLength(500),
        ),
  },
  {
    name: "boss-status",
    description: "Show the active boss status.",
    help: "Show active boss health. Use the visibility option to share it publicly.",
    buildCommand: (command) =>
      command.addStringOption((option) =>
        option
          .setName("visibility")
          .setDescription("Who should see the boss health?")
          .addChoices(
            { name: "Private", value: "private" },
            { name: "Public", value: "public" },
          ),
      ),
  },
  {
    name: "boss-log",
    description: "Show recent active boss damage entries.",
    help: "Show recent active boss damage entries.",
  },
  {
    name: "faq",
    description: "Show the frequently asked questions.",
    help: "Show the site-backed frequently asked questions.",
  },
  {
    name: "rollstats",
    description: "Roll 5 valid stat lines and post them to the stat roll repository.",
    help: "Roll 5 valid stat lines (80–84 total, ≥2 over 12, ≥1 over 15, ≥1 under 10) and save them to the site.",
  },
];

const commands = COMMAND_DEFINITIONS.map((definition) => {
  const command = new SlashCommandBuilder()
    .setName(definition.name)
    .setDescription(definition.description);

  return (definition.buildCommand
    ? definition.buildCommand(command)
    : command
  ).toJSON();
});


async function registerGuildCommands() {
  const rest = new REST({ version: "10" }).setToken(config.token);
  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commands },
  );
  console.log(
    `Slash commands registered: ${COMMAND_DEFINITIONS.map((command) => `/${command.name}`).join(", ")}`,
  );
}


function buildHelpMessage(interaction) {
  const canUseRoleCommands = hasRequiredRole(interaction);
  const canUseDmCommands = hasDmOrRequiredRole(interaction);
  return COMMAND_DEFINITIONS.filter(
    (command) =>
      (!command.requiresRole || canUseRoleCommands) &&
      (!command.requiresDmOrRole || canUseDmCommands),
  ).map(
    (command) => `/${command.name} - ${command.help}`,
  ).join("\n");
}


module.exports = {
  COMMAND_DEFINITIONS,
  buildHelpMessage,
  commands,
  registerGuildCommands,
};
