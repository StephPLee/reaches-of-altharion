import { chromium } from "playwright";
import fs from "node:fs";

const token = fs.readFileSync("C:/Users/Steph/reaches-of-altharion/scripts/_session_token.txt", "utf8").trim();

const browser = await chromium.launch();
const context = await browser.newContext();
await context.addCookies([{ name: "roa_admin_session", value: token, domain: "127.0.0.1", path: "/" }]);
const page = await context.newPage();

await page.setViewportSize({ width: 1400, height: 1100 });
await page.goto("http://127.0.0.1:3000/world-timeline", { waitUntil: "networkidle" });
await page.waitForTimeout(500);

const info = await page.evaluate(() => {
  const track = document.querySelector('[class*="track_"]');
  const column = document.querySelector('[class*="column_"]');
  const dot = column.querySelector('[class*="dot_"]');
  const era = column.querySelector('[class*="columnEra_"]');
  const line = document.querySelector('[class*="trackLine_"]');

  const trackRect = track.getBoundingClientRect();
  const columnRect = column.getBoundingClientRect();
  const dotRect = dot.getBoundingClientRect();
  const eraRect = era.getBoundingClientRect();
  const lineRect = line.getBoundingClientRect();
  const trackStyle = getComputedStyle(track);

  return {
    trackBottom: trackRect.bottom,
    trackPaddingBottom: trackStyle.paddingBottom,
    columnBottom: columnRect.bottom,
    dotCenterY: dotRect.top + dotRect.height / 2,
    dotBottom: dotRect.bottom,
    dotHeight: dotRect.height,
    eraTop: eraRect.top,
    eraBottom: eraRect.bottom,
    eraHeight: eraRect.height,
    lineTop: lineRect.top,
    lineCenterY: lineRect.top + lineRect.height / 2,
  };
});
console.log(JSON.stringify(info, null, 2));

await browser.close();
