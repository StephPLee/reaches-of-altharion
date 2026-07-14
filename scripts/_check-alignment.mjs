import { chromium } from "playwright";
import fs from "node:fs";

const outDir = "C:/Users/Steph/reaches-of-altharion/.verify-screenshots";
const token = fs.readFileSync("C:/Users/Steph/reaches-of-altharion/scripts/_session_token.txt", "utf8").trim();

const browser = await chromium.launch();
const context = await browser.newContext();
await context.addCookies([{ name: "roa_admin_session", value: token, domain: "127.0.0.1", path: "/" }]);
const page = await context.newPage();
const errors = [];
page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

await page.setViewportSize({ width: 1400, height: 1100 });
await page.goto("http://127.0.0.1:3000/world-timeline", { waitUntil: "networkidle" });
await page.waitForTimeout(500);

const dots = await page.locator('[class*="dot_"]').all();
const dotCenters = [];
for (const dot of dots) {
  const box = await dot.boundingBox();
  if (box) dotCenters.push(Math.round(box.y + box.height / 2));
}
console.log("dot vertical centers (should all match):", dotCenters);

const line = page.locator('[class*="trackLine_"]');
const lineBox = await line.boundingBox();
console.log("line center y:", Math.round(lineBox.y + lineBox.height / 2));

await page.screenshot({ path: `${outDir}/bottom-line-final.png`, fullPage: true });

console.log("errors:", errors.join(" | ") || "(none)");
await browser.close();
