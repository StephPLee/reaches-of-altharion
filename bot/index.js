const { Client, GatewayIntentBits } = require("discord.js");
const config = require("./config");
const { registerGuildCommands } = require("./commands");
const { handleInteraction } = require("./interactions");

const bot = new Client({
  intents: [GatewayIntentBits.Guilds],
});

bot.once("ready", async () => {
  console.log(`Logged in as ${bot.user.tag}`);
  try {
    await registerGuildCommands();
  } catch (error) {
    console.error("Failed to register slash command:", error);
  }
});

bot.on("interactionCreate", handleInteraction);

bot.login(config.token);
