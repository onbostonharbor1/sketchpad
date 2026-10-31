/* tests/pixelShots.mjs
   -----------------------------------------------------------
   Takes 25 pictures of the running app (every tab, each Commands panel, the
   Help browser, the Edit Manifest dialog, the Parametrics accordion) and
   saves them as PNG files in a folder. Run it twice, before and after a
   change, then compare the two folders with tests/pixelCompare.mjs.

   Needs the app running (npm run dev:all). Run:
       npm run pixels:save -- before      (writes pixel-refs/before/)
       ... make your change ...
       npm run pixels:save -- after       (writes pixel-refs/after/)
       npm run pixels:compare -- before after

   Animations and transitions are switched off so two runs of the same code
   give the same pictures. Optional: SKETCHPAD_URL=http://localhost:5173/
   The pictures are not committed (pixel-refs/ is in .gitignore).
   ----------------------------------------------------------- */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const URL_ = process.env.SKETCHPAD_URL || "http://localhost:5173/";
const name = process.argv[2];
if (!name) { console.error("usage: node tests/pixelShots.mjs <folder name>"); process.exit(2); }
const OUT = path.join("pixel-refs", name);
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", e => errors.push(e.message.slice(0, 160)));
await page.goto(URL_, { waitUntil: "networkidle" });
await page.addStyleTag({ content: "*{animation:none!important;transition:none!important;caret-color:transparent!important}" });
await page.waitForTimeout(1200);

const names = [];
async function shot(label) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, label + ".png") });
  names.push(label);
}
const tab = async (t, ms = 1200) => { await page.click(`#${t}-tab`); await page.waitForTimeout(ms); };
const sub = async (txt) => { await page.locator("#subtabs button", { hasText: txt }).first().click(); await page.waitForTimeout(700); };
const item = async (key, ms = 1800) => { await page.click(`#text .item[data-key="${key}"] span`); await page.waitForTimeout(ms); };
const cmds = async (label) => {
  await page.click("#commandsButton"); await page.waitForTimeout(700); await shot(label);
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
};

await shot("01-home");
await cmds("02-home-commands");
await tab("draw"); await shot("03-draw-list");
await cmds("04-draw-commands");
await item("Cycloid"); await shot("05-draw-cycloid");
await page.locator("#caption .caption-buttons button", { hasText: /^v$/ }).click().catch(() => {});
await page.waitForTimeout(500); await shot("06-draw-caption-menu");
await page.keyboard.press("Escape"); await page.mouse.click(700, 850); await page.waitForTimeout(300);
await tab("draw", 800); await sub("Categories"); await item("Parametrics"); await shot("06b-draw-parametrics");
const acc = page.locator(".accordion-button");
if (await acc.count() > 0) {
  await acc.nth(0).click(); await page.waitForTimeout(900); await shot("06c-draw-accordion-closed");
  await acc.nth(0).click(); await page.waitForTimeout(900); await shot("06d-draw-accordion-reopened");
}
await tab("patterns"); await shot("07-patterns-list");
await cmds("08-patterns-commands");
await item("First Build", 2200); await shot("09-patterns-firstbuild");
await tab("gallery"); await shot("10-gallery-ideabook");
await sub("Patterns"); await shot("11-gallery-patterns");
await sub("Scripts"); await shot("12-gallery-scripts");
await cmds("13-gallery-commands");
await page.click("#text .item span"); await page.waitForTimeout(2500); await shot("14-gallery-script-run");
await tab("figures"); await shot("15-figures-empty");
await page.click("#createFigureButton"); await page.waitForTimeout(800);
await page.click("#figureInsert_parabola"); await page.waitForTimeout(600);
await page.click("#figureInsert_drawLine"); await page.waitForTimeout(900);
await shot("16-figures-two-layers");
await cmds("17-figures-commands");
await tab("utilities"); await shot("18-utilities-list");
await cmds("19-utilities-commands");
await item("Validate Draw Registry", 2200); await shot("20-utilities-result");
await tab("home", 600);
await page.evaluate(async () => { const h = await import("/ui/help.js"); h.openHelpHomeOverlay(); });
await page.waitForTimeout(1200); await shot("21-help-browser");
await page.evaluate(() => { document.getElementById("overlayClose")?.click(); });
await page.waitForTimeout(400);
await page.evaluate(async () => {
  const d = await import("/ui/editManifestDialog.js");
  d.openEditManifestDialog({ manifestPath: "/patterns/manifest.json", matchField: "filename", matchValue: "x.js", title: "T", status: "", statusPresets: ["working", "draft"] });
});
await page.waitForTimeout(600); await shot("22-edit-manifest-dialog");

fs.writeFileSync(path.join(OUT, "_names.json"), JSON.stringify(names));
await browser.close();
console.log(`${names.length} pictures in ${OUT}` + (errors.length ? `; page errors: ${errors.join(" | ")}` : "; no page errors"));
process.exit(errors.length ? 1 : 0);
