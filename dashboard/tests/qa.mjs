import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = "http://127.0.0.1:4177/";
const out = (n) => path.resolve(__dirname, "..", "..", "data", `qa-${n}.png`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#stage");
// Wait for the first state to populate the panel (gateway leaves "unknown").
await page.waitForFunction(() => {
  const t = document.getElementById("timestamp");
  return t && t.textContent.startsWith("Updated");
}, { timeout: 20000 });
await page.waitForTimeout(3500); // let employees walk toward their conversation partners
await page.screenshot({ path: out("1-office-walking") });

// Click the Analytics menu button.
await page.click('.display-menu button[data-panel="analytics"]');
await page.waitForTimeout(400);
const analyticsTitle = await page.textContent("#rotating-title");
await page.screenshot({ path: out("2-analytics") });

// Click the Queue menu button.
await page.click('.display-menu button[data-panel="queue"]');
await page.waitForTimeout(400);
const queueTitle = await page.textContent("#rotating-title");

// Click the Bank menu button.
await page.click('.display-menu button[data-panel="bank"]');
await page.waitForTimeout(300);
const bankTitle = await page.textContent("#rotating-title");

// Switch to floor 2 (Research).
await page.click('.floor-pill[data-floor="1"]');
await page.waitForTimeout(800);
await page.screenshot({ path: out("3-research-floor") });
const floor2Active = await page.getAttribute('.floor-pill[data-floor="1"]', "class");

// Switch to floor 3 (Archive).
await page.click('.floor-pill[data-floor="2"]');
await page.waitForTimeout(800);
await page.screenshot({ path: out("4-archive-floor") });

// Back to ops, click an employee on the canvas (claw is near center-top desk).
await page.click('.floor-pill[data-floor="0"]');
await page.waitForTimeout(600);
const box = await page.$eval("#stage", (el) => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, w: r.width, h: r.height };
});
// claw home is ~ (242,96) in a 480x272 virtual space.
await page.mouse.click(box.left + (242 / 480) * box.w, box.top + (96 / 272) * box.h);
await page.waitForTimeout(400);
const profileTitle = await page.textContent("#rotating-title");
await page.screenshot({ path: out("5-employee-profile") });

await browser.close();

console.log(JSON.stringify({
  analyticsTitle,
  queueTitle,
  bankTitle,
  floor2Active,
  profileTitle,
  consoleErrors: errors.slice(0, 10),
}, null, 2));
