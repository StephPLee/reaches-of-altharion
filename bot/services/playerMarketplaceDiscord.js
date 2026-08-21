const pool = require("../db");
const config = require("../config");
const {
  syncPlayerMarketplaceDiscord,
  syncPlayerRequestsDiscord,
} = require("../../shared/playerMarketplaceDiscord");

async function syncDisplay(discordClient, syncFunction) {
  const channelId = config.playerMarketplaceChannelId;
  if (!channelId) return [];
  const channel = await discordClient.channels.fetch(channelId);
  if (!channel?.isTextBased() || !channel.messages) {
    throw new Error("The player marketplace channel is not a text channel.");
  }

  return syncFunction({
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

function updatePlayerMarketplaceMessage(discordClient) {
  return syncDisplay(discordClient, syncPlayerMarketplaceDiscord);
}

function updatePlayerRequestMessage(discordClient) {
  return syncDisplay(discordClient, syncPlayerRequestsDiscord);
}

module.exports = { updatePlayerMarketplaceMessage, updatePlayerRequestMessage };
