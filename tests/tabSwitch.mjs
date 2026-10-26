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

/* ---- Part 4: Figures shell ---------------------------------
   Create Figure opens an "Untitled 1" subtab with an empty figure; it
   is still there, and active, after visiting another tab. */
stage = "figures create";
await page.click("#figures-tab");
await page.waitForTimeout(800);
await page.click("#createFigureButton");
await page.waitForTimeout(800);
const before = await snapshot("figures");
if (!/Untitled 1/.test(before.subtabs)) problems.push(`[figures create] subtabs: ${before.subtabs}`);
if (!/^Untitled 1 Line Parabola .*v$/.test(before.caption)) problems.push(`[figures create] caption: ${before.caption}`);
const vis = (sel) => page.locator(sel).isVisible();
if (await vis("#createFigureButton"))  problems.push("[figures create] Create Figure still visible on a figure tab");
if (!(await vis("#figureInsertSelect"))) problems.push("[figures create] Insert Object not visible on a figure tab");
if ((await page.locator("#subtabs #figureInsert_parabola").count()) !== 0) problems.push("[figures create] tools still in the subtab bar");
await page.locator("#subtabs button", { hasText: "Categories" }).click();
await page.waitForTimeout(500);
if (!(await vis("#createFigureButton"))) problems.push("[figures categories] Create Figure not visible on Categories");
if (await vis("#figureInsertSelect"))    problems.push("[figures categories] Insert Object visible on Categories");
await page.locator("#subtabs button", { hasText: "Untitled 1" }).click();
await page.waitForTimeout(500);
stage = "figures return";
await page.click("#draw-tab");
await page.waitForTimeout(800);
await page.click("#figures-tab");
await page.waitForTimeout(1200);
const after = await snapshot("figures");
for (const k of Object.keys(before)) {
  if (before[k] !== after[k]) problems.push(`[figures return] ${k} changed: "${before[k]}" -> "${after[k]}"`);
}
const fig = await page.evaluate(() => uiState.figures.tabs[uiState.figures.activeSubtab].figure);
if (fig.nextPoint !== 1 || fig.layers.length !== 0 || fig.points.length !== 0) {
  problems.push("[figures return] figure is not empty: " + JSON.stringify(fig));
}

/* ---- Part 5: Insert objects (Phase 6a) ---------------------- */
stage = "figures insert";
// Show or hide layer i (0-based): select it, then use the Show checkbox.
const setVis = async (i, on) => {
  await page.locator("#figure-sidebar .figure-layer-row span").nth(i).click();
  await page.locator("#figureLayerShow").setChecked(on);
  await page.waitForTimeout(150);
};
const inked = () => page.evaluate(() => {
  const c = window.drawCanvas, d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) n += 765 - d[i] - d[i + 1] - d[i + 2];   // total darkness
  return n;
});
const blank = await inked();
await page.click("#figureInsert_drawLine");
await page.waitForTimeout(400);
const one = await inked();
await page.click("#figureInsert_parabola");
await page.waitForTimeout(400);
await page.selectOption("#figureInsertSelect", { index: 2 });
await page.waitForTimeout(400);
await page.click("#figureInsert_parabola");
await page.waitForTimeout(400);
const many = await inked();
const lay = await page.evaluate(() => uiState.figures.tabs[uiState.figures.activeSubtab].figure.layers.map(l => l.id));
if (lay.length !== 4) problems.push("[figures insert] expected 4 layers: " + lay);
if (!(one > blank)) problems.push(`[figures insert] line drew nothing (${blank} -> ${one})`);
if (!(many > one)) problems.push(`[figures insert] more layers did not add ink (${one} -> ${many})`);
const rows = await page.locator("#figure-sidebar .figure-layer-row").count();
if (rows !== 4) problems.push("[figures insert] layer rows in the strip: " + rows);
if ((await page.locator("#action .figure-layer-row").count()) !== 0) problems.push("[figures insert] layer rows left in the action panel");

stage = "figures offset";
const pts = await page.evaluate(() => {
  const t = uiState.figures.tabs[uiState.figures.activeSubtab];
  return t.figure.layers.map(l => ({ id: l.id, p: (l.params.points || []).map(q => [q.x, q.y]) }));
});
const parab = pts.filter(q => q.id === "parabola");
if (parab.length !== 2 || JSON.stringify(parab[0].p) === JSON.stringify(parab[1].p)) {
  problems.push("[figures offset] two parabolas share the same points: " + JSON.stringify(parab));
}

stage = "figures order";
const order = () => page.evaluate(() => uiState.figures.tabs[uiState.figures.activeSubtab].figure.drawOrder.join(","));
if ((await order()) !== "3,2,1,0") problems.push("[figures order] after inserts: " + await order());
await page.locator("#figure-sidebar .figure-layer-row span").nth(0).click();
await page.waitForTimeout(300);
if ((await order()) !== "0,3,2,1") problems.push("[figures order] after clicking 1: " + await order());
await page.locator("#figure-sidebar .figure-layer-row span").nth(1).click();
await page.waitForTimeout(300);
if ((await order()) !== "1,0,3,2") problems.push("[figures order] after clicking 2: " + await order());
const heading = await page.locator("#figureLayerLabel").innerText();
if (!/^Layer 2/.test(heading)) problems.push("[figures order] layer label: " + heading);
if ((await page.locator("#figureLayerHeading").count()) !== 0) problems.push("[figures order] heading still in the left panel");

stage = "figures dim";
for (let i = 0; i < 4; i++) await setVis(i, i === 0 || i === 1);
await page.waitForTimeout(300);
await page.locator("#figure-sidebar .figure-layer-row span").nth(0).click();   // layer 1 (line) active
await page.waitForTimeout(300);
const lineActive = await inked();
await page.locator("#figure-sidebar .figure-layer-row span").nth(1).click();   // layer 2 active, line dimmed
await page.waitForTimeout(300);
if (!(lineActive > 0)) problems.push("[figures dim] nothing drawn");
await setVis(1, false);
await page.waitForTimeout(300);
const dimmedOnly = await inked();
if (!(dimmedOnly < lineActive)) problems.push(`[figures dim] dimmed line not lighter (${dimmedOnly} vs ${lineActive})`);
for (let i = 0; i < 4; i++) await setVis(i, true);
await page.waitForTimeout(300);

stage = "figures visibility";
for (let i = 0; i < 4; i++) await setVis(i, false);
await page.waitForTimeout(300);
const hidden = await inked();
if (hidden !== blank) problems.push(`[figures visibility] all hidden but ink ${hidden} vs ${blank}`);
await setVis(0, true);
await page.waitForTimeout(300);
if (!((await inked()) > blank)) problems.push("[figures visibility] showing layer 1 drew nothing");

stage = "figures preview";
await setVis(0, true);
for (let i = 1; i < 4; i++) await setVis(i, false);
const editInk = await inked();
await page.click("#figurePreviewCheck");
await page.waitForTimeout(300);
const previewInk = await inked();
if (!(previewInk > editInk)) problems.push(`[figures preview] preview did not show hidden layers (${editInk} -> ${previewInk})`);
await page.click("#figurePreviewCheck");
await page.waitForTimeout(300);
if ((await inked()) !== editInk) problems.push("[figures preview] leaving preview did not restore the edit view");
for (let i = 0; i < 4; i++) await setVis(i, true);

stage = "figures return with layers";
await page.click("#draw-tab");
await page.waitForTimeout(800);
const btnOnDraw = await page.locator("#createFigureButton").count();
if (btnOnDraw !== 0) problems.push("[figures button] Create Figure still present on Draw");
await page.click("#figures-tab");
await page.waitForTimeout(1200);
if ((await page.locator("#figure-sidebar .figure-layer-row").count()) !== 4) problems.push("[figures return] layer rows lost");
if (!((await inked()) > blank)) problems.push("[figures return] picture not redrawn");

/* ---- Part 6: Points mode (Phase 6b, 6c) ---------------------
   Points mode is a checkbox. A click places a disc on the ACTIVE layer
   only: anchored (on an infrastructure point) or free. Only free discs
   can be dragged; the object's own handles are draggable in both modes,
   and anchored discs ride along. Anchored discs keep their fraction when
   the step count changes. A disc can be deleted; numbers are never
   reused. The selected disc is drawn with a red ring. Discs take their
   layer's color and are dimmed (50%) on layers that are not active.
   The tools that add layers are grayed out in points mode. */
stage = "points mode";
await page.click("#figures-tab");
await page.waitForTimeout(800);
await page.locator("#subtabs button", { hasText: "Categories" }).click();
await page.waitForTimeout(300);
await page.click("#createFigureButton");
await page.waitForTimeout(500);
await page.click("#figureInsert_drawLine");
await page.click("#figureInsert_parabola");
await page.waitForTimeout(400);
if ((await page.locator("#figureNumbersButton").count()) !== 0) problems.push("[points mode] Numbers button still present");
if ((await page.locator("#figureModeButton").count()) !== 0) problems.push("[points mode] old Points Mode button still present");
await page.check("#figureModeCheck");
await page.waitForTimeout(400);

const rect = () => page.evaluate(() => {
  const b = document.getElementById("interaction-layer").getBoundingClientRect();
  return [b.left, b.top, b.width, b.height];
});
const clickAt = async (x, y) => {
  const r = await rect();
  await page.mouse.click(r[0] + x * r[2] / 800, r[1] + y * r[3] / 800);
  await page.waitForTimeout(150);
};
const dragTo = async (x0, y0, x1, y1) => {
  const r = await rect();
  const sx = (x) => r[0] + x * r[2] / 800, sy = (y) => r[1] + y * r[3] / 800;
  await page.mouse.move(sx(x0), sy(y0));
  await page.mouse.down();
  await page.mouse.move(sx(x1), sy(y1), { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(150);
};
const points = () => page.evaluate(() =>
  uiState.figures.tabs[uiState.figures.activeSubtab].figure.points.map(p => ({ ...p })));
const selected = () => page.evaluate(() =>
  uiState.figures.tabs[uiState.figures.activeSubtab].selectedPoint);
const pickLayer = async (i) => {
  await page.locator("#figure-sidebar .figure-layer-row span").nth(i).click();
  await page.waitForTimeout(250);
};
const px = (x, y) => page.evaluate(([x, y]) =>
  Array.from(window.drawCanvas.getContext("2d").getImageData(x, y, 1, 1).data), [x, y]);
const isRed = (c) => c[0] > 150 && c[1] < 70 && c[2] < 70;
const menuItems = async () => {
  await page.locator("#caption .caption-buttons button", { hasText: /^v$/ }).click();
  await page.waitForTimeout(500);
  const items = await page.evaluate(() =>
    [...document.querySelectorAll(".caption-menu-item")].map(e => [e.innerText, e.classList.contains("disabled")]));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  if (await page.locator(".caption-menu-item").count()) {
    await page.mouse.click(5, 5);
    await page.waitForTimeout(200);
  }
  return items;
};

stage = "points tools grayed";
for (const id of ["figureInsert_drawLine", "figureInsert_parabola", "figureInsertSelect"]) {
  if (!(await page.locator("#" + id).isDisabled())) problems.push(`[points tools] ${id} should be disabled in points mode`);
}

stage = "points mode";
await pickLayer(0);               // layer 1, the line (handles at 200,200 / 400,400 / 300,300)
await clickAt(203, 198);          // on the line's start handle: a click places an anchored disc
await clickAt(700, 100);          // empty canvas: free, on layer 1
await clickAt(203, 198);          // same spot again selects disc 1, makes no new one
let pl = await points();
if (pl.length !== 2) problems.push("[points] clicking an existing disc made a new one: " + JSON.stringify(pl));
await pickLayer(1);               // layer 2, the parabola
await clickAt(52, 125);           // parabola arm 1, division 5 of 20 (t = 0.25)
pl = await points();
if (pl.length !== 3 || pl.map(p => p.n).join() !== "1,2,3") problems.push("[points] numbers: " + JSON.stringify(pl));
if (pl.map(p => p.kind).join() !== "anchored,free,anchored") problems.push("[points] kinds: " + pl.map(p => p.kind));
if (pl.map(p => p.layer).join() !== "0,0,1") problems.push("[points] layers: " + pl.map(p => p.layer));

stage = "points active layer only";
// Layer 2 is active. Disc 1 belongs to layer 1 and sits at the line's start:
// clicking there must not select it, and must not anchor to the line either.
await clickAt(203, 198);
pl = await points();
const stray = pl.find(p => p.n === 4);
if (!stray || stray.kind !== "free" || stray.layer !== 1) problems.push("[points active layer] expected free disc 4 on layer 2: " + JSON.stringify(pl));
if ((await selected()) !== 4) problems.push("[points active layer] selected: " + (await selected()));
await page.keyboard.press("Delete");
await page.waitForTimeout(200);
if ((await points()).some(p => p.n === 4)) problems.push("[points active layer] disc 4 not deleted");
await clickAt(52, 125);           // select disc 3 on layer 2
if ((await selected()) !== 3) problems.push("[points active layer] disc 3 not selected: " + (await selected()));
await pickLayer(0);
if ((await selected()) !== null) problems.push("[points active layer] selection survived a layer change");
await pickLayer(1);

stage = "points proportional";
// Steps 20 -> 30 (and back to 12): the anchored disc keeps t = 0.25 exactly.
for (const steps of [30, 12]) {
  await page.evaluate((v) => {
    const el = [...document.querySelectorAll("#drawControls input[type=range]")].find(i => i.max === "30");
    el.value = String(v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, steps);
  await page.waitForTimeout(250);
  const q = (await points()).find(p => p.n === 3);
  if (Math.abs(q.t - 0.25) > 1e-9 || Math.abs(q.x - 50) > 0.01 || Math.abs(q.y - 125) > 0.01) {
    problems.push(`[points proportional] steps ${steps}: ${JSON.stringify(q)}`);
  }
}

stage = "points colors and dimming";
// Layer 1 is red (#c0392b), layer 2 blue (#2471a3). Free disc 2 (layer 1) sits at 700,100.
const chip = await page.locator("#figure-sidebar .figure-layer-row span").nth(0).evaluate(e => getComputedStyle(e).backgroundColor);
if (chip !== "rgb(192, 57, 43)") problems.push("[points colors] layer 1 chip color: " + chip);
const dimmedDisc = await px(705, 100);          // layer 2 is active: disc 2 is dimmed
await pickLayer(0);
const fullDisc = await px(705, 100);
if (!(fullDisc[1] < 80 && fullDisc[0] > 150)) problems.push("[points colors] active disc not layer 1 red: " + fullDisc);
if (!(dimmedDisc[1] > fullDisc[1] + 50)) problems.push(`[points colors] dimmed disc not lighter: ${dimmedDisc} vs ${fullDisc}`);
// A new color from the strip's picker repaints the disc.
await page.evaluate(() => {
  const input = document.querySelector("#figure-sidebar .figure-layer-row input[type=color]");
  input.value = "#00aa00";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForTimeout(200);
const green = await px(705, 100);
if (!(green[1] > 120 && green[0] < 60)) problems.push("[points colors] changed layer color not applied to disc: " + green);
// Hiding a layer hides its discs, in points mode too.
await page.uncheck("#figureLayerShow");
await page.waitForTimeout(250);
const gone = await px(705, 100);
if (!(gone[0] > 240 && gone[1] > 240 && gone[2] > 240)) problems.push("[points colors] disc of a hidden layer still shown: " + gone);
await page.check("#figureLayerShow");
await page.waitForTimeout(250);

stage = "points drag";
// A free disc drags. An anchored disc does not.
await dragTo(700, 100, 600, 300);
const dragged = (await points()).find(p => p.n === 2);
if (Math.abs(dragged.x - 600) > 2 || Math.abs(dragged.y - 300) > 2) problems.push("[points drag] free disc: " + JSON.stringify(dragged));
await dragTo(600, 300, 700, 100);   // back to where later tests expect it
await pickLayer(1);
const before3 = (await points()).find(p => p.n === 3);
await dragTo(50, 125, 90, 275);
const after3 = (await points()).find(p => p.n === 3);
if (Math.abs(after3.x - before3.x) > 0.01 || Math.abs(after3.y - before3.y) > 0.01 || after3.t !== before3.t) problems.push("[points drag] anchored disc moved: " + JSON.stringify(after3));
if ((await points()).length !== 3) problems.push("[points drag] a drag made or removed a disc");
await pickLayer(0);

stage = "points handles drag";
// Handles still drag in points mode, and the anchored disc 1 rides along.
await dragTo(200, 200, 230, 250);
const handle0 = await page.evaluate(() => {
  const t = uiState.figures.tabs[uiState.figures.activeSubtab];
  return { ...t.instances[0].params.points[0] };
});
if (Math.abs(handle0.x - 230) > 3 || Math.abs(handle0.y - 250) > 3) problems.push("[points handles] handle did not drag: " + JSON.stringify(handle0));
const rode = (await points()).find(p => p.n === 1);
if (Math.abs(rode.x - handle0.x) > 0.5 || Math.abs(rode.y - handle0.y) > 0.5) problems.push("[points handles] anchored disc did not follow: " + JSON.stringify(rode));
if ((await points()).length !== 3) problems.push("[points handles] dragging a handle made a disc");

stage = "points delete";
await clickAt(700, 100);          // select disc 2 (free, layer 1)
if ((await selected()) !== 2) problems.push("[points delete] disc 2 not selected");
await page.keyboard.press("Delete");
await page.waitForTimeout(200);
pl = await points();
if (pl.some(p => p.n === 2)) problems.push("[points delete] disc 2 still there");
await clickAt(500, 500);          // empty canvas: a new free disc
pl = await points();
if (!pl.some(p => p.n === 5) || pl.some(p => p.n === 2 || p.n === 4)) problems.push("[points delete] number reuse: " + pl.map(p => p.n));

stage = "points selected shown";
// Disc 5 is selected and drawn with an outer red ring 13 px from its center.
if (!isRed(await px(513, 500))) problems.push("[points selected] no red ring on the selected disc: " + (await px(513, 500)));
await clickAt(500, 400);          // another free disc takes the selection
if (isRed(await px(513, 500))) problems.push("[points selected] old disc still shows selected");
await page.keyboard.press("Delete");
await page.waitForTimeout(200);

stage = "points hit radius";
await clickAt(505, 503);          // inside disc 5's marker: selects it, makes nothing
if ((await points()).length !== pl.length) problems.push("[points hit radius] click on a marker made a new disc");
await pickLayer(1);
// Arm 2 of the parabola has divisions every 25 px (12 steps), e.g. (125,350).
await page.evaluate(() => { uiState.figures.hitRadius = 1; });
await clickAt(125, 354);          // 4 px off the division: outside radius 1 -> free disc
let last = (await points()).at(-1);
if (last.kind !== "free") problems.push("[points hit radius] radius 1 should give a free disc: " + JSON.stringify(last));
await page.evaluate(() => { uiState.figures.hitRadius = 5; });
await clickAt(175, 354);          // 4 px off the division at 175: inside radius 5 -> anchored
last = (await points()).at(-1);
if (last.kind !== "anchored" || last.arm !== "arm2") problems.push("[points hit radius] radius 5 should anchor: " + JSON.stringify(last));

stage = "points menu";
await pickLayer(1);
await clickAt(175, 354);          // a disc of layer 2 is selected
let items = await menuItems();
let del = items.find(m => /Delete selected/.test(m[0]));
if (!del || del[1]) problems.push("[points menu] Delete selected point should be enabled in points mode with a disc selected: " + JSON.stringify(del));

stage = "points back to lines";
await page.uncheck("#figureModeCheck");
await page.waitForTimeout(300);
items = await menuItems();
del = items.find(m => /Delete selected/.test(m[0]));
if (!del || !del[1]) problems.push("[points menu] Delete selected point should be grayed in lines mode: " + JSON.stringify(del));
for (const id of ["figureInsert_drawLine", "figureInsert_parabola", "figureInsertSelect"]) {
  if (await page.locator("#" + id).isDisabled()) problems.push(`[points tools] ${id} still disabled in lines mode`);
}
const mode = await page.evaluate(() => uiState.figures.tabs[uiState.figures.activeSubtab].mode);
if (mode !== "lines") problems.push("[points back to lines] mode: " + mode);
// Discs stay visible in lines mode, in their layer's color (disc 5, layer 1, is dimmed
// because layer 2 is active, so it is a light tint of the color chosen above: green).
const face = await px(506, 500);
if (!(face[1] > face[0] + 30 && face[1] > 120 && face[1] < 250)) problems.push("[points back to lines] disc not shown in lines mode: " + face);
if (!(await page.locator("#figureInsert_parabola").isVisible())) problems.push("[points back to lines] caption tools missing");

await browser.close();

for (const n of notes.slice(0, 5)) console.log("note:", n);
if (notes.length > 5) console.log(`note: ... ${notes.length - 5} more network notes`);
for (const t of TABS) console.log(t.padEnd(10), JSON.stringify(first[t]));
if (problems.length) {
  console.log("\nFAIL");
  for (const p of problems) console.log(" ", p);
  process.exit(1);
}
console.log("\nPASS: 6 tabs x 2 passes, plus Draw and Patterns with an open item, plus the Notes menu item, plus the Figures shell, insert and points mode, no errors");
