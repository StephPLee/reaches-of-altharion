import { createServer } from "node:http";
import process from "node:process";
import {
  assertOAuthClientConfig,
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  getOAuthConfig,
} from "./google-oauth-lib.mjs";

async function main() {
  const config = getOAuthConfig();
  assertOAuthClientConfig(config);

  const redirectUrl = new URL(config.redirectUri);
  const port = Number(redirectUrl.port || 80);

  if (redirectUrl.hostname !== "127.0.0.1" && redirectUrl.hostname !== "localhost") {
    throw new Error(
      "GOOGLE_OAUTH_REDIRECT_URI must use localhost or 127.0.0.1 for the login helper.",
    );
  }

  const code = await waitForAuthorizationCode({
    port,
    expectedPath: redirectUrl.pathname,
    authorizationUrl: buildAuthorizationUrl(config),
  });
  const tokenResponse = await exchangeAuthorizationCode({ code, config });

  if (!tokenResponse.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Revoke prior consent for this OAuth client and run the flow again.",
    );
  }

  console.log("\nAdd this to .env:");
  console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokenResponse.refresh_token}`);
}

function waitForAuthorizationCode({ port, expectedPath, authorizationUrl }) {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const requestUrl = new URL(req.url, `http://127.0.0.1:${port}`);

        if (requestUrl.pathname !== expectedPath) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not found");
          return;
        }

        const code = requestUrl.searchParams.get("code");
        const error = requestUrl.searchParams.get("error");

        if (error) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end(`Authorization failed: ${error}`);
          server.close();
          reject(new Error(`Authorization failed: ${error}`));
          return;
        }

        if (!code) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing authorization code");
          return;
        }

        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Google auth complete. Return to the terminal.");
        server.close();
        resolve(code);
      } catch (error) {
        server.close();
        reject(error);
      }
    });

    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      console.log("Open this URL in your browser and approve access:\n");
      console.log(authorizationUrl);
      console.log(
        "\nWaiting for the Google OAuth callback on " +
          `http://127.0.0.1:${port}${expectedPath}`,
      );
    });
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
