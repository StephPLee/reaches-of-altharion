const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_OAUTH_BASE_URL = "https://discord.com/oauth2";
const {
  discordBotToken,
  discordClientId,
  discordClientSecret,
  discordGuildId,
  discordOauthRedirectUri,
} = require("./config");

function buildAuthorizationUrl() {
  throw new Error("buildAuthorizationUrl requires a state value.");
}

function buildAuthorizationUrlWithState(state) {
  const url = new URL(`${DISCORD_OAUTH_BASE_URL}/authorize`);
  url.searchParams.set("client_id", discordClientId);
  url.searchParams.set("redirect_uri", discordOauthRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "identify");
  url.searchParams.set("state", state);
  return url.toString();
}

async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    client_id: discordClientId,
    client_secret: discordClientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: discordOauthRedirectUri,
  });

  const response = await fetch(`${DISCORD_API_BASE_URL}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to exchange Discord authorization code: ${response.status} ${errorText}`,
    );
  }

  return response.json();
}

async function fetchDiscordUser(accessToken) {
  const response = await fetch(`${DISCORD_API_BASE_URL}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch Discord user: ${response.status} ${errorText}`,
    );
  }

  return response.json();
}

async function fetchGuildMember(discordUserId) {
  const url = `${DISCORD_API_BASE_URL}/guilds/${discordGuildId}/members/${discordUserId}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bot ${discordBotToken}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch guild member: ${response.status} ${errorText}`,
    );
  }

  return response.json();
}

async function postChannelMessage(channelId, payload) {
  const response = await fetch(
    `${DISCORD_API_BASE_URL}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${discordBotToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to post Discord channel message: ${response.status} ${errorText}`,
    );
  }

  return response.json();
}

async function fetchGuildRoles() {
  const url = `${DISCORD_API_BASE_URL}/guilds/${discordGuildId}/roles`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bot ${discordBotToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch guild roles: ${response.status} ${errorText}`
    );
  }

  return response.json();
}

function memberHasRole(member, requiredRoleId) {
  return Array.isArray(member?.roles) && member.roles.includes(requiredRoleId);
}

module.exports = {
  buildAuthorizationUrl: buildAuthorizationUrlWithState,
  exchangeCodeForToken,
  fetchDiscordUser,
  fetchGuildMember,
  fetchGuildRoles,
  memberHasRole,
  postChannelMessage,
};
