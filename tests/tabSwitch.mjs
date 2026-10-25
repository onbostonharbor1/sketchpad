/* tests/tabSwitch.mjs
   ------------------------------------------------------------
   Tab-switch test. Loads the running app, visits every tab twice,
   and checks that:
     * no uncaught page errors or app console errors occur
     * the active tab matches the tab that was clicked
     * each tab shows the same subtabs, caption and content type
       on the second visit as on the first (restore consistency)

   Needs the app running:  npm run dev:all   (Vite on 5173,
   service on 5174). Run:   node tests/tabSwitch.mjs
   Needs the playwright package:  npm i -D playwright
   Optional: SKETCHPAD_URL=http://localhost:5173/ to change the URL.

   Network failures (CDN, offline) are reported but do not fail
   the test. Set TEST_LOCAL_BOOTSTRAP=1 to serve bootstrap from
   node_modules/bootstrap instead of the CDN.
   ------------------------------------------------------------ */

import { createRequire } from "node:module";
import fs from "node:fs";

const require   = createRequire(import.meta.url);
const { chromium } = require("playwright");

const URL  = process.env.SKETCHPAD_URL || "http://localhost:5173/";
const TABS = ["home", "draw", "patterns", "figures", "gallery", "utilities"];

const problems = [];   // fail the test
const notes    = [];   // reported only

const browser = await chromium.launch();
const page    = await browser.newPage({ viewport: { width: 1400, height: 900 } });

if (process.env.TEST_LOCAL_BOOTSTRAP) {
  page.route("**/cdn.jsdelivr.net/**", route => {
    const u = route.request().url();
    const f = u.endsWith(".css")
      ? "node_modules/bootstrap/dist/css/bootstrap.min.css"
      : "node_modules/bootstrap/dist/js/bootstrap.bundle.min.js";
    route.fulfill({ path: f });
  });
}

let stage = "load";
page.on("pageerror", e => problems.push(`[${stage}] pageerror: ${e.message}`));
page.on("console", m => {
  if (m.type() !== "error") return;
  const t = m.text();
  if (/Failed to load resource|ERR_/.test(t)) notes.push(`[${stage}] ${t}`);
  else problems.push(`[${stage}] console.error: ${t}`);
});

async function snapshot(tab) {
  return page.evaluate(() => {
    const txt = id => (document.getElementById(id)?.innerText || "").replace(/\s+/g, " ").trim();
    return {
      activeTab: uiState.activeTab,
      subtabs:   txt("subtabs"),
      caption:   txt("caption"),
      hasText:   txt("text").length > 0 && document.getElementById("text").style.display !== "none",
      hasCanvas: document.getElementById("sketchpad-wrapper")?.style.display !== "none"
    };
  });
}

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

const first = {};
for (let pass = 1; pass <= 2; pass++) {
  for (const tab of TABS) {
    stage = `${tab} pass ${pass}`;
    await page.click(`#${tab}-tab`);
    await page.waitForTimeout(1200);
    const s = await snapshot(tab);
    if (s.activeTab !== tab) problems.push(`[${stage}] activeTab is ${s.activeTab}`);
    if (pass === 1) first[tab] = s;
    else {
      for (const k of Object.keys(s)) {
        if (s[k] !== first[tab][k]) {
          problems.push(`[${stage}] ${k} changed: "${first[tab][k]}" -> "${s[k]}"`);
        }
      }
    }
  }
}

/* ---- Part 2: tabs holding state ----------------------------
   Open an object in Draw and a pattern in Patterns, leave, come
   back, and check the same subtab and caption are showing. */
async function stateScenario(tab, itemKey) {
  stage = `${tab} open ${itemKey}`;
  await page.click(`#${tab}-tab`);
  await page.waitForTimeout(800);
  await page.click(`#text .item[data-key="${itemKey}"] span`);
  await page.waitForTimeout(1500);
  const opened = await snapshot(tab);
  await page.click("#utilities-tab");
  await page.waitForTimeout(800);
  stage = `${tab} return`;
  await page.click(`#${tab}-tab`);
  await page.waitForTimeout(1500);
  const back = await snapshot(tab);
  for (const k of Object.keys(opened)) {
    if (opened[k] !== back[k]) {
      problems.push(`[${stage}] ${k} changed: "${opened[k]}" -> "${back[k]}"`);
    }
  }
  console.log(`${tab} with ${itemKey}:`, JSON.stringify(back));
}

await stateScenario("draw", "Cycloid");
await stateScenario("patterns", "First Build");

/* ---- Part 3: Notes menu item in Draw ------------------------
   Cycloid has header notes: Notes is enabled and the popup shows them.
   Circular Parabola has none: Notes is grayed out. */
async function drawMenuItems(key) {
  stage = `draw menu ${key}`;
  await page.click("#draw-tab");
  await page.waitForTimeout(800);
  await page.locator("#subtabs button", { hasText: "Categories" }).first().click();
  await page.waitForTimeout(600);
  await page.click(`#text .item[data-key="${key}"] span`);
  await page.waitForTimeout(1500);
  await page.locator("#caption .caption-buttons button", { hasText: /^v$/ }).click();
  await page.waitForTimeout(700);
  return page.evaluate(() =>
    [...document.querySelectorAll(".caption-menu-item")].map(e => [e.innerText, e.classList.contains("disabled")]));
}

let menu = await drawMenuItems("Cycloid");
const notesItem = menu.find(m => m[0] === "Notes");
if (!notesItem)          problems.push("[draw menu Cycloid] no Notes item");
else if (notesItem[1])   problems.push("[draw menu Cycloid] Notes is grayed out");
else {
  await page.click(".caption-menu-item:has-text('Notes')");
  await page.waitForTimeout(800);
  const shown = await page.evaluate(() => document.querySelector(".overlayHelp")?.innerText || "");
  if (!/cardioid/i.test(shown)) problems.push("[draw menu Cycloid] popup lacks the header notes");
  console.log("Notes popup:", JSON.stringify(shown.slice(0, 60)));
  const buttons = await page.evaluate(() =>
    [...document.querySelectorAll(".overlayHelpToolbar button")].map(b => b.innerText));
  if (buttons.join("|") !== "Show Script|Open in VS Code") {
    problems.push(`[draw menu Cycloid] popup buttons are: ${buttons.join("|")}`);
  }
  // Show Script must tear the popup down and show the script panel
  await page.click("#notesAction0");
  await page.waitForTimeout(1200);
  const state = await page.evaluate(() => ({
    overlay: document.getElementById("overlayContainer").style.display,
    panel:   document.getElementById("offcanvasPanel").classList.contains("show")
  }));
  if (state.overlay !== "none") problems.push("[show script] notes popup was not closed");
  if (!state.panel)             problems.push("[show script] script panel not shown");
}
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1200);

menu = await drawMenuItems("Circular Parabola");
const none = menu.find(m => m[0] === "Notes");
if (!none || !none[1]) problems.push("[draw menu Circular Parabola] Notes should be grayed out");

/* Patterns scripts get the same Notes item */
await page.click("#patterns-tab");
await page.waitForTimeout(800);
await page.locator("#subtabs button", { hasText: "Categories" }).first().click();
await page.waitForTimeout(600);
await page.click('#text .item[data-key="First Build"] span');
await page.waitForTimeout(1500);
await page.locator("#caption .caption-buttons button", { hasText: /^v$/ }).click();
await page.waitForTimeout(700);
const pmenu = await page.evaluate(() =>
  [...document.querySelectorAll(".caption-menu-item")].map(e => e.innerText));
if (!pmenu.includes("Notes")) problems.push("[patterns menu] no Notes item");

await browser.close();

for (const n of notes.slice(0, 5)) console.log("note:", n);
if (notes.length > 5) console.log(`note: ... ${notes.length - 5} more network notes`);
for (const t of TABS) console.log(t.padEnd(10), JSON.stringify(first[t]));
if (problems.length) {
  console.log("\nFAIL");
  for (const p of problems) console.log(" ", p);
  process.exit(1);
}
console.log("\nPASS: 6 tabs x 2 passes, plus Draw and Patterns with an open item, plus the Notes menu item, no errors");
