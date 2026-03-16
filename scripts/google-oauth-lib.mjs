import "dotenv/config";
import process from "node:process";

export const DEFAULT_REDIRECT_URI = "http://127.0.0.1:3005/oauth2callback";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
export const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export function getOAuthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || DEFAULT_REDIRECT_URI;

  return {
    clientId,
    clientSecret,
    refreshToken,
    redirectUri,
  };
}

export function assertOAuthClientConfig(config) {
  if (!config.clientId || !config.clientSecret) {
    throw new Error(
      "Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET.",
    );
  }
}

export function buildAuthorizationUrl(config) {
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", DRIVE_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

export async function exchangeAuthorizationCode({ code, config }) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to exchange Google authorization code: ${response.status} ${errorText}`,
    );
  }

  return response.json();
}

export async function getAccessToken(config) {
  if (!config.refreshToken) {
    throw new Error("Missing GOOGLE_OAUTH_REFRESH_TOKEN.");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to refresh Google access token: ${response.status} ${errorText}`,
    );
  }

  const data = await response.json();
  return data.access_token;
}
