import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  assertOAuthClientConfig,
  getAccessToken,
  getOAuthConfig,
} from "./google-oauth-lib.mjs";

const DEFAULT_MANIFEST = "content/google-docs.json";
const GOOGLE_DOC_MIME_TYPE = "application/vnd.google-apps.document";

async function main() {
  const manifestPath = path.resolve(
    process.cwd(),
    process.env.GOOGLE_DOCS_MANIFEST || DEFAULT_MANIFEST,
  );
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const oauthConfig = getOAuthConfig();

  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error(`Manifest ${manifestPath} does not contain any entries.`);
  }

  assertOAuthClientConfig(oauthConfig);

  const accessToken = await getAccessToken(oauthConfig);

  for (const entry of manifest) {
    await syncEntry(entry, accessToken);
  }
}

async function syncEntry(entry, accessToken) {
  const { sourceUrl, outputPath } = entry;

  if (!sourceUrl || !outputPath) {
    throw new Error(
      "Each manifest entry must include sourceUrl and outputPath.",
    );
  }

  const { docId, resourceKey } = parseGoogleDocUrl(sourceUrl);
  const metadata = await getGoogleDocMetadata({
    docId,
    resourceKey,
    accessToken,
  });

  if (metadata.mimeType !== GOOGLE_DOC_MIME_TYPE) {
    throw new Error(
      `File ${docId} is not a Google Doc. Found mimeType=${metadata.mimeType}.`,
    );
  }

  if (metadata.capabilities?.canDownload === false) {
    throw new Error(
      `Google Doc ${docId} is visible but cannot be downloaded/exported by the current Google account.`,
    );
  }

  const outputFile = path.resolve(process.cwd(), outputPath);
  const markdown = await exportGoogleDocAsMarkdown({
    docId,
    resourceKey,
    accessToken,
  });
  const normalizedMarkdown = normalizeExportedMarkdown(markdown, entry);
  const frontMatter = buildFrontMatter(entry);
  const body = frontMatter
    ? `${frontMatter}\n\n${normalizedMarkdown}\n`
    : `${normalizedMarkdown}\n`;

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, body, "utf8");

  console.log(`Synced ${docId} -> ${path.relative(process.cwd(), outputFile)}`);
}

function parseGoogleDocUrl(sourceUrl) {
  let url;

  try {
    url = new URL(sourceUrl);
  } catch {
    throw new Error(`Invalid sourceUrl: ${sourceUrl}`);
  }

  const match = url.pathname.match(/\/document\/d\/([^/]+)/);

  if (!match) {
    throw new Error(`Could not extract docId from sourceUrl: ${sourceUrl}`);
  }

  return {
    docId: match[1],
    resourceKey: url.searchParams.get("resourcekey") || undefined,
  };
}

function buildFrontMatter(entry) {
  const reservedKeys = new Set([
    "sourceUrl",
    "outputPath",
    "title_override",
    "strip_thematic_breaks",
  ]);
  const lines = Object.entries(entry)
    .filter(
      ([key, value]) =>
        !reservedKeys.has(key) && value !== undefined && value !== null,
    )
    .map(([key, value]) => `${key}: ${formatFrontMatterValue(value)}`);

  if (lines.length === 0) {
    return "";
  }

  return ["---", ...lines, "---"].join("\n");
}

function formatFrontMatterValue(value) {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value) || typeof value === "object") {
    return JSON.stringify(value);
  }

  throw new Error(`Unsupported front matter value: ${String(value)}`);
}

function normalizeExportedMarkdown(markdown, entry) {
  let lines = markdown.replace(/\r\n/g, "\n").trim().split("\n");

  applyTitleOverride(lines, entry.title_override);

  const duplicateHeadingIndex = findDuplicateLeadingHeadingIndex(lines);

  if (duplicateHeadingIndex !== -1) {
    lines.splice(duplicateHeadingIndex, 1);

    if (lines[duplicateHeadingIndex] === "") {
      lines.splice(duplicateHeadingIndex, 1);
    }
  }

  if (entry.strip_thematic_breaks) {
    lines = lines.filter((line) => !isThematicBreak(line));
  }

  return lines.join("\n").trim();
}

function applyTitleOverride(lines, titleOverride) {
  if (!titleOverride || lines.length === 0) {
    return;
  }

  const normalizedTitle = titleOverride.trim();

  for (let index = 0; index < Math.min(lines.length, 8); index += 1) {
    const match = lines[index].match(/^(#)\s+(.*)$/);

    if (!match) {
      continue;
    }

    if (match[2].trim() === normalizedTitle) {
      lines[index] = `# ${normalizedTitle}`;

      if (index !== 0) {
        lines.splice(0, index);
      }

      return;
    }
  }

  const firstHeadingIndex = lines.findIndex((line) => /^(#)\s+/.test(line));

  if (firstHeadingIndex !== -1) {
    lines[firstHeadingIndex] = `# ${normalizedTitle}`;
  }
}

function findDuplicateLeadingHeadingIndex(lines) {
  if (lines.length === 0) {
    return -1;
  }

  for (let index = 1; index < Math.min(lines.length, 5); index += 1) {
    if (lines[index].trim() === "") {
      continue;
    }

    return isSameHeading(lines[0], lines[index]) ? index : -1;
  }

  return -1;
}

function isSameHeading(firstLine, secondLine) {
  const firstMatch = firstLine.match(/^(#{1,6})\s+(.*)$/);
  const secondMatch = secondLine.match(/^(#{1,6})\s+(.*)$/);

  if (!firstMatch || !secondMatch) {
    return false;
  }

  return (
    firstMatch[1] === secondMatch[1] &&
    firstMatch[2].trim() === secondMatch[2].trim()
  );
}

function isThematicBreak(line) {
  return /^(\s*)([-*_])(\s*\2){2,}\s*$/.test(line);
}

async function getGoogleDocMetadata({ docId, resourceKey, accessToken }) {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${docId}`);
  url.searchParams.set("fields", "id,name,mimeType,capabilities(canDownload)");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...buildResourceKeyHeaders(docId, resourceKey),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch Google Doc metadata ${docId}: ${response.status} ${errorText}`,
    );
  }

  return response.json();
}

async function exportGoogleDocAsMarkdown({ docId, resourceKey, accessToken }) {
  const url = new URL(
    `https://www.googleapis.com/drive/v3/files/${docId}/export`,
  );
  url.searchParams.set("mimeType", "text/markdown");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...buildResourceKeyHeaders(docId, resourceKey),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to export Google Doc ${docId}: ${response.status} ${errorText}`,
    );
  }

  return response.text();
}

function buildResourceKeyHeaders(docId, resourceKey) {
  if (!resourceKey) {
    return {};
  }

  return {
    "X-Goog-Drive-Resource-Keys": `${docId}/${resourceKey}`,
  };
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
