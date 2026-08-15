const pool = require("../db");
const config = require("../config");
const { syncPlayerMarketplaceDiscord } = require("../../shared/playerMarketplaceDiscord");

async function updatePlayerMarketplaceMessage(discordClient) {
  const channelId = config.playerMarketplaceChannelId;
  if (!channelId) return [];
  const channel = await discordClient.channels.fetch(channelId);
  if (!channel?.isTextBased() || !channel.messages) {
    throw new Error("The player marketplace channel is not a text channel.");
  }

  return syncPlayerMarketplaceDiscord({
    pool,
    channelId,
    siteUrl: config.publicSiteUrl,
    postMessage: (_channelId, payload) => channel.send(payload),
    editMessage: async (_channelId, messageId, payload) => {
      const message = await channel.messages.fetch(messageId);
      return message.edit(payload);
    },
    deleteMessage: async (_channelId, messageId) => {
      const message = await channel.messages.fetch(messageId);
      return message.delete();
    },
  });
}

module.exports = { updatePlayerMarketplaceMessage };
