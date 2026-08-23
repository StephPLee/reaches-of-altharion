import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const buildDir = path.join(repoRoot, "build");
const baselinePath = path.join(__dirname, "build-size-baseline.json");

// How much a bundle is allowed to grow over the committed baseline before this warns.
const GROWTH_WARN_RATIO = 1.1;

function largestFileSize(dir, pattern) {
  if (!existsSync(dir)) return null;
  const matches = readdirSync(dir).filter((name) => pattern.test(name));
  if (matches.length === 0) return null;
  return Math.max(...matches.map((name) => statSync(path.join(dir, name)).size));
}

function main() {
  const mainJsSize = largestFileSize(
    path.join(buildDir, "assets", "js"),
    /^main\.[a-z0-9]+\.js$/,
  );
  const cssSize = largestFileSize(
    path.join(buildDir, "assets", "css"),
    /^styles\.[a-z0-9]+\.css$/,
  );

  if (mainJsSize === null || cssSize === null) {
    console.error(
      "Could not find build/assets/js/main.*.js or build/assets/css/styles.*.css — run `npm run build` first.",
    );
    process.exitCode = 1;
    return;
  }

  const current = { mainJsBytes: mainJsSize, cssBytes: cssSize };

  if (!existsSync(baselinePath)) {
    writeFileSync(baselinePath, JSON.stringify(current, null, 2) + "\n");
    console.log(`No baseline found — wrote ${path.relative(repoRoot, baselinePath)}:`);
    console.log(current);
    return;
  }

  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  let regressed = false;

  for (const key of ["mainJsBytes", "cssBytes"]) {
    const before = baseline[key];
    const after = current[key];
    const ratio = after / before;
    const status = ratio > GROWTH_WARN_RATIO ? "WARN" : "ok";
    console.log(
      `${key}: ${before} -> ${after} bytes (${(ratio * 100).toFixed(1)}%) [${status}]`,
    );
    if (status === "WARN") regressed = true;
  }

  if (regressed) {
    console.warn(
      `\nOne or more bundles grew by more than ${((GROWTH_WARN_RATIO - 1) * 100).toFixed(0)}% versus the committed baseline.`,
    );
    console.warn(
      `If this growth is intentional, update the baseline by deleting ${path.relative(repoRoot, baselinePath)} and re-running this script.`,
    );
    process.exitCode = 1;
  } else {
    console.log("\nBundle sizes are within budget.");
  }
}

main();
