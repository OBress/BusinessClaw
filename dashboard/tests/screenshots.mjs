import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = "http://127.0.0.1:4177/";
const dir = path.resolve(__dirname, "..", "..", "docs", "screenshots");
fs.mkdirSync(dir, { recursive: true });
const shot = (name) => path.join(dir, name);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 760 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#stage");
await page.waitForFunction(() => {
  const t = document.getElementById("timestamp");
  return t && t.textContent.startsWith("Updated");
}, { timeout: 20000 });

// Let Claw walk across the office, through the doorways, to Ledger in Finance.
await page.waitForTimeout(12000);

// Hero "in action" shot — zoom into the Finance conversation, Analytics panel.
await page.click('.display-menu button[data-panel="analytics"]');
await page.evaluate(() => {
  const o = window.Office;
  o.cam.zoom = 1.95;
  o.cam.x = 250;
  o.cam.y = 560;
  o.clampCam();
});
await page.waitForTimeout(600);
await page.screenshot({ path: shot("dashboard-action.png") });

// 1F Ops — full floor overview with the Office roster panel.
await page.click('.display-menu button[data-panel="office"]');
await page.evaluate(() => window.Office.fit());
await page.waitForTimeout(600);
await page.screenshot({ path: shot("floor-1-ops.png") });

// 2F Research — full floor with the Queue panel.
await page.click('.floor-pill[data-floor="1"]');
await page.waitForTimeout(800);
await page.click('.display-menu button[data-panel="queue"]');
await page.waitForTimeout(500);
await page.screenshot({ path: shot("floor-2-research.png") });

// B1 Archive — full floor with the File Cabinet panel.
await page.click('.floor-pill[data-floor="2"]');
await page.waitForTimeout(800);
await page.click('.display-menu button[data-panel="cabinet"]');
await page.waitForTimeout(500);
await page.screenshot({ path: shot("floor-3-archive.png") });

await browser.close();
console.log("screenshots written to " + dir);
console.log(fs.readdirSync(dir).join("\n"));
