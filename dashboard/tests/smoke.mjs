import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = process.env.BUSINESSCLAW_DASHBOARD_URL || "http://127.0.0.1:4177/";
const screenshotPath = path.resolve(__dirname, "..", "..", "data", "dashboard-smoke.png");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForSelector("#stage", { timeout: 15000 });
// Let the canvas engine initialise and the first state load.
await page.waitForFunction(() => Boolean(window.__BUSINESSCLAW_SCENE__), { timeout: 15000 });
await page.waitForTimeout(2500);

const report = await page.evaluate(() => {
  const scene = window.__BUSINESSCLAW_SCENE__ || {};
  return {
    title: document.title,
    // Must remain a pure display: no form controls anywhere.
    formInputCount: document.querySelectorAll("input, textarea, select, form").length,
    readOnlyButtons: document.querySelectorAll(".display-menu button").length,
    floorButtons: document.querySelectorAll(".floor-pill").length,
    canvas: Boolean(document.querySelector("#stage")),
    // Clickable pixel employees come from the canvas engine, not the DOM.
    clickableSprites: scene.agents || 0,
    floors: scene.floors || 0,
    microphone: Boolean(document.querySelector("#board-mic")),
    bank: document.querySelector("#bank-level")?.textContent || "",
    menuItems: [...document.querySelectorAll(".display-menu button")].map((b) => b.textContent),
  };
});

await page.screenshot({ path: screenshotPath, fullPage: true });
await browser.close();

if (report.formInputCount !== 0) {
  throw new Error(`Dashboard must remain command-input-free, found ${report.formInputCount} form controls.`);
}
if (
  !report.canvas ||
  report.clickableSprites < 3 ||
  report.floors < 3 ||
  report.floorButtons < 3 ||
  !report.microphone ||
  report.readOnlyButtons < 6
) {
  throw new Error(`Dashboard scene is incomplete: ${JSON.stringify(report)}`);
}

console.log(JSON.stringify({ ...report, screenshotPath }, null, 2));
