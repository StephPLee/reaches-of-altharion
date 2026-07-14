import { chromium } from "playwright";
import fs from "node:fs";

const outDir = "C:/Users/Steph/reaches-of-altharion/.verify-screenshots";
const token = fs.readFileSync("C:/Users/Steph/reaches-of-altharion/scripts/_session_token.txt", "utf8").trim();

const browser = await chromium.launch();
const context = await browser.newContext();
await context.addCookies([{ name: "roa_admin_session", value: token, domain: "127.0.0.1", path: "/" }]);
const page = await context.newPage();
page.on("console", (msg) => console.log("[console]", msg.type(), msg.text()));
page.on("pageerror", (err) => console.log("[pageerror]", err.message));
page.on("response", (res) => {
  if (res.url().includes("/api/admin/timeline") && res.request().method() !== "GET") {
    console.log("response:", res.request().method(), res.url(), res.status());
  }
});

await page.setViewportSize({ width: 1400, height: 1100 });
await page.goto("http://127.0.0.1:3000/world-timeline", { waitUntil: "networkidle" });

await page.getByRole("button", { name: "Add Event" }).click();
await page.getByLabel("Title").fill("Thaloryn Rises");
await page.getByLabel("Era Label").fill("Age of Dawn, Year 0");
await page.waitForTimeout(200);
await page.screenshot({ path: `${outDir}/debug-form-before-checkbox.png` });

await page.getByText("Chapter marker (show a full island illustration instead of a card)").click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/debug-form-after-checkbox.png` });

const isChecked = await page.locator('input[type="checkbox"]').first().isChecked();
console.log("checkbox checked:", isChecked);

const comboboxCount = await page.getByRole("combobox", { name: "Island" }).count();
console.log("island combobox count:", comboboxCount);

if (comboboxCount > 0) {
  await page.getByRole("combobox", { name: "Island" }).selectOption("/img/Thaloryn.png");
}
await page.waitForTimeout(200);

await page.getByRole("button", { name: "Create Event" }).click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${outDir}/debug-after-create-click.png` });

await browser.close();
