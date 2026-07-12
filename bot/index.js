const { Client, GatewayIntentBits } = require("discord.js");
const config = require("./config");
const { ActivityType } = require("discord.js");
const { registerGuildCommands } = require("./commands");
const { handleInteraction } = require("./interactions");
const { handleMessageForSticky } = require("./services/stickyMessages");

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

bot.once("clientReady", async () => {
  console.log(`Logged in as ${bot.user.tag}`);
  bot.user.setPresence({
    activities: [
      {
        name: "/help | /faq",
        type: ActivityType.Playing,
      },
    ],
    status: "online",
  });

  try {
    await registerGuildCommands();
  } catch (error) {
    console.error("Failed to register slash command:", error);
  }
});

bot.on("interactionCreate", async (interaction) => {
  try {
    await handleInteraction(interaction);
  } catch (error) {
    console.error("Unhandled interaction error:", error);
  }
});

bot.on("messageCreate", (message) => {
  handleMessageForSticky(bot, message).catch((error) => {
    console.error("Unhandled sticky message error:", error);
  });
});

bot.on("error", (error) => {
  console.error("Discord client error:", error);
});

bot.login(config.token);
