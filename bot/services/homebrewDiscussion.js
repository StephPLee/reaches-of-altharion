const { ChannelType } = require("discord.js");

const DISCORD_ID_PATTERN = /^\d{17,20}$/;
const DISCORD_MESSAGE_URL_PATTERN =
  /discord(?:app)?\.com\/channels\/(?<guildId>\d{17,20}|@me)\/(?<channelId>\d{17,20})\/(?<messageId>\d{17,20})/i;
const DISCORD_CHANNEL_URL_PATTERN =
  /discord(?:app)?\.com\/channels\/(?<guildId>\d{17,20}|@me)\/(?<channelId>\d{17,20})(?:[/?#]|$)/i;

function extractDiscordIds(value) {
  const input = typeof value === "string" ? value.trim() : "";
  if (!input) {
    return {};
  }

  if (DISCORD_ID_PATTERN.test(input)) {
    return { id: input };
  }

  const messageMatch = input.match(DISCORD_MESSAGE_URL_PATTERN);
  if (messageMatch?.groups) {
    return {
      guildId: messageMatch.groups.guildId,
      channelId: messageMatch.groups.channelId,
      messageId: messageMatch.groups.messageId,
      id: messageMatch.groups.messageId,
    };
  }

  const channelMatch = input.match(DISCORD_CHANNEL_URL_PATTERN);
  if (channelMatch?.groups) {
    return {
      guildId: channelMatch.groups.guildId,
      channelId: channelMatch.groups.channelId,
      id: channelMatch.groups.channelId,
    };
  }

  const ids = input.match(/\d{17,20}/g) || [];
  if (ids.length >= 3) {
    return {
      guildId: ids[ids.length - 3],
      channelId: ids[ids.length - 2],
      messageId: ids[ids.length - 1],
      id: ids[ids.length - 1],
    };
  }

  if (ids.length >= 2) {
    return {
      guildId: ids[ids.length - 2],
      channelId: ids[ids.length - 1],
      id: ids[ids.length - 1],
    };
  }

  if (ids.length === 1) {
    return { id: ids[0] };
  }

  return {};
}

function chunkMentionLines(userIds, { header, emptyText }) {
  if (userIds.length === 0) {
    return [{ content: emptyText, userIds: [] }];
  }

  const chunks = [];
  let current = header;
  let currentUserIds = [];

  for (const userId of userIds) {
    const mention = `<@${userId}>`;
    const next = `${current}${current === header ? "\n" : " "}${mention}`;

    if (next.length > 1900 || currentUserIds.length >= 100) {
      chunks.push({ content: current, userIds: currentUserIds });
      current = `${header}\n${mention}`;
      currentUserIds = [userId];
    } else {
      current = next;
      currentUserIds.push(userId);
    }
  }

  chunks.push({ content: current, userIds: currentUserIds });
  return chunks;
}

async function fetchAllThreadMessages(threadChannel) {
  const messages = [];
  let before;

  while (true) {
    const batch = await threadChannel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {}),
    });

    messages.push(...batch.values());

    if (batch.size < 100) {
      break;
    }

    before = batch.lastKey();
  }

  return messages;
}

async function getThreadOwnerId(threadChannel) {
  if (threadChannel.ownerId) {
    return threadChannel.ownerId;
  }

  if (typeof threadChannel.fetchOwner === "function") {
    const owner = await threadChannel.fetchOwner().catch(() => null);
    if (owner?.id) {
      return owner.id;
    }
  }

  if (typeof threadChannel.fetchStarterMessage === "function") {
    const starterMessage = await threadChannel
      .fetchStarterMessage()
      .catch(() => null);
    if (starterMessage?.author?.id) {
      return starterMessage.author.id;
    }
  }

  return null;
}

async function fetchReactionUsers(message) {
  const users = new Map();

  for (const reaction of message.reactions.cache.values()) {
    let after;

    while (true) {
      const batch = await reaction.users.fetch({
        limit: 100,
        ...(after ? { after } : {}),
      });

      for (const user of batch.values()) {
        users.set(user.id, user);
      }

      if (batch.size < 100) {
        break;
      }

      after = batch.lastKey();
    }
  }

  return [...users.values()];
}

async function fetchThreadChannel(client, threadInput) {
  const parsedThread = extractDiscordIds(threadInput);
  const threadId = parsedThread.channelId || parsedThread.id;

  if (!threadId) {
    throw new Error("invalid_thread");
  }

  const channel = await client.channels.fetch(threadId);

  if (
    !channel ||
    ![
      ChannelType.PublicThread,
      ChannelType.PrivateThread,
      ChannelType.AnnouncementThread,
    ].includes(channel.type)
  ) {
    throw new Error("not_thread");
  }

  return channel;
}

async function fetchSubmissionMessage(client, messageInput, fallbackChannel) {
  const parsedMessage = extractDiscordIds(messageInput);
  const messageId = parsedMessage.messageId || parsedMessage.id;
  const channelId = parsedMessage.channelId || fallbackChannel?.id;

  if (!messageId) {
    throw new Error("invalid_message");
  }

  if (!channelId) {
    throw new Error("missing_message_channel");
  }

  const channel = await client.channels.fetch(channelId);
  if (!channel?.messages?.fetch) {
    throw new Error("message_channel_unavailable");
  }

  return channel.messages.fetch(messageId);
}

async function collectHomebrewDiscussionParticipants({
  client,
  threadInput,
  messageInput,
  fallbackChannel,
}) {
  const thread = await fetchThreadChannel(client, threadInput);
  const submissionMessage = await fetchSubmissionMessage(
    client,
    messageInput,
    fallbackChannel,
  );
  const threadMessages = await fetchAllThreadMessages(thread);
  const reactedUsers = await fetchReactionUsers(submissionMessage);
  const threadOwnerId = await getThreadOwnerId(thread);
  const participantIds = new Set();
  const threadAuthorIds = new Set();
  const reactionUserIds = new Set();

  for (const message of threadMessages) {
    const user = message.author;
    if (!user?.id || user.bot || user.id === threadOwnerId) {
      continue;
    }

    threadAuthorIds.add(user.id);
    participantIds.add(user.id);
  }

  for (const user of reactedUsers) {
    if (!user?.id || user.bot || user.id === threadOwnerId) {
      continue;
    }

    reactionUserIds.add(user.id);
    participantIds.add(user.id);
  }

  return {
    thread,
    threadOwnerId,
    submissionMessage,
    participantIds: [...participantIds].sort(),
    threadAuthorIds: [...threadAuthorIds].sort(),
    reactionUserIds: [...reactionUserIds].sort(),
    threadMessageCount: threadMessages.length,
  };
}

module.exports = {
  chunkMentionLines,
  collectHomebrewDiscussionParticipants,
};
