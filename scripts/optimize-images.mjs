import sharp from "sharp";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const imgDir = path.join(repoRoot, "static", "img");

const WEBP_QUALITY = 80;
const BACKGROUND_QUALITY = 75;
const SIZE_BUDGET_BYTES = 500 * 1024;

// "portrait": single resize, capped width, used in a bounded content column.
// "responsive": multiple widths for a full-bleed/srcSet image.
// "background": single resize, used as a full-viewport CSS background.
const TARGETS = [
  {
    src: "guild leaders/Golden Quill - AethelddxD.png",
    mode: "portrait",
    maxWidth: 1200,
  },
  {
    src: "guild leaders/Iron Vanguard - BELONG.png",
    mode: "portrait",
    maxWidth: 1200,
  },
  {
    src: "guild leaders/Black Hand - Heroes of Might and Magic.png",
    mode: "portrait",
    maxWidth: 1200,
  },
  {
    src: "guild leaders/Verdant Accord - Lichelet.png",
    mode: "portrait",
    maxWidth: 1200,
  },
  {
    src: "guild leaders/Dragon's Den of Drama - SnowmanAndOctopus.png",
    mode: "portrait",
    maxWidth: 1200,
  },
  {
    src: "guild leaders/Dread Legion.jpeg",
    mode: "portrait",
    maxWidth: 1200,
  },
  { src: "Solcrata.png", mode: "responsive", widths: [480, 768, 1200, 2048] },
  { src: "Verdalis.png", mode: "responsive", widths: [480, 768, 1200, 2048] },
  { src: "Thaloryn.png", mode: "responsive", widths: [480, 768, 1200, 2048] },
  { src: "Abysmere.png", mode: "responsive", widths: [480, 768, 1200, 2048] },
  { src: "Tenebryn.png", mode: "responsive", widths: [480, 768, 1200, 2048] },
  { src: "Iskralith.png", mode: "responsive", widths: [480, 768, 1200, 2048] },
  {
    src: "altharion-no-frame.png",
    mode: "responsive",
    widths: [480, 768, 1200, 2048],
  },
  {
    src: "altharion-background.png",
    mode: "background",
    maxWidth: 1920,
  },
];

function isUpToDate(sourcePath, outputPath) {
  if (!existsSync(outputPath)) return false;
  return statSync(outputPath).mtimeMs >= statSync(sourcePath).mtimeMs;
}

async function writeWebp(sourcePath, outputPath, width, quality) {
  if (isUpToDate(sourcePath, outputPath)) {
    console.log(`  skip (up to date): ${path.relative(repoRoot, outputPath)}`);
    return;
  }
  const image = sharp(sourcePath);
  const metadata = await image.metadata();
  const targetWidth = width && width < metadata.width ? width : undefined;
  await image
    .resize(targetWidth ? { width: targetWidth } : undefined)
    .webp({ quality })
    .toFile(outputPath);

  const outputSize = statSync(outputPath).size;
  const relOutput = path.relative(repoRoot, outputPath);
  console.log(`  wrote ${relOutput} (${(outputSize / 1024).toFixed(0)}KB)`);
  if (outputSize > SIZE_BUDGET_BYTES) {
    console.warn(
      `  ! ${relOutput} exceeds the ${(SIZE_BUDGET_BYTES / 1024).toFixed(0)}KB budget (${(outputSize / 1024).toFixed(0)}KB) — consider a lower quality/width.`,
    );
  }
}

async function processTarget(target) {
  const sourcePath = path.join(imgDir, target.src);
  if (!existsSync(sourcePath)) {
    console.warn(`  ! source not found, skipping: ${target.src}`);
    return;
  }
  const { dir, name } = path.parse(sourcePath);
  console.log(`${target.src}:`);

  if (target.mode === "portrait" || target.mode === "background") {
    const quality =
      target.mode === "background" ? BACKGROUND_QUALITY : WEBP_QUALITY;
    const outputPath = path.join(dir, `${name}.webp`);
    await writeWebp(sourcePath, outputPath, target.maxWidth, quality);
  } else if (target.mode === "responsive") {
    for (const width of target.widths) {
      const outputPath = path.join(dir, `${name}-${width}.webp`);
      await writeWebp(sourcePath, outputPath, width, WEBP_QUALITY);
    }
  }
}

async function main() {
  console.log(`Optimizing images in ${path.relative(repoRoot, imgDir)}...\n`);
  for (const target of TARGETS) {
    await processTarget(target);
  }
  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
