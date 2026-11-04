/* tests/scriptHistory.mjs
   ------------------------------------------------------------
   Tests Script history (ui/scriptHistory.js) in the running app.

   The two Node requests (listScriptHistory, readScriptHistoryVersion) are
   answered by this test, so it does not depend on what VS Code has saved
   on this computer; test:node tests the requests themselves against a
   pretend history folder. The pretend history here is two versions of
   patterns/curve_stitch/twoParabolas.js (a script with relative imports):
   the file as it is, and an older one whose number of steps differs.

     1. lineDiff marks removed and added lines.
     2. The caption menu item is built for a script, greyed for a non-script.
     3. The panel lists both versions, newest first.
     4. Run on the old version draws something different from the file,
        and says so; the file on disk is unchanged.
     5. Diff shows the changed line as - and +.
     6. "Run the file as it is now" draws the file again, as at the start.

   Needs the app running (npm run dev:all). Run: npm run test:history
   Optional: SKETCHPAD_URL, PW_CHROMIUM.
   ------------------------------------------------------------ */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./scriptList.mjs";

const URL    = process.env.SKETCHPAD_URL || "http://localhost:5173/";
const SCRIPT = "/patterns/curve_stitch/twoParabolas.js";
const problems = [];
const check = (ok, what) => { console.log((ok ? "  ok   " : "  FAIL ") + what); if (!ok) problems.push(what); };

const current = fs.readFileSync(path.join(ROOT, SCRIPT), "utf8");
const stepsLine = current.split("\n").find((l) => /numSteps\s*:\s*\d+/.test(l));
if (!stepsLine) { console.error("test needs a numSteps line in " + SCRIPT); process.exit(2); }
const older = current.replace(stepsLine, stepsLine.replace(/numSteps\s*:\s*(\d+)/, (m, n) => "numSteps: " + (Number(n) + 7)));

const executablePath = process.env.PW_CHROMIUM || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

// Answer the history requests; pass every other request to the service.
await page.route("**/dispatch", async (route) => {
  const req = JSON.parse(route.request().postData() || "{}");
  const reply = (json) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(json) });
  if (req.requestName === "listScriptHistory") {
    return reply({ request: "listScriptHistory", status: "ok", root: "(test)", found: req.payload.path === SCRIPT,
      versions: req.payload.path === SCRIPT ? [
        { id: "now.js", timestamp: Date.UTC(2026, 10, 2, 15, 0), size: current.length },
        { id: "old.js", timestamp: Date.UTC(2026, 10, 2, 14, 0), size: older.length }] : [] });
  }
  if (req.requestName === "readScriptHistoryVersion") {
    return reply({ request: "readScriptHistoryVersion", status: "ok", id: req.payload.id, text: req.payload.id === "old.js" ? older : current });
  }
  return route.continue();
});

await page.goto(URL);
await page.waitForFunction(() => window.drawRegistry && window.drawCanvas, null, { timeout: 20000 });
await page.click("#patterns-tab");
await page.waitForTimeout(600);

// A short fingerprint of what is on the canvas.
const canvasPrint = () => page.evaluate(() => {
  const d = window.drawCanvas.getContext("2d").getImageData(0, 0, window.drawCanvas.width, window.drawCanvas.height).data;
  let h = 0;
  for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) >>> 0;
  return h;
});

try {
  console.log("1. lineDiff");
  const diff = await page.evaluate(async () => {
    const { lineDiff } = await import("/ui/scriptHistory.js");
    return lineDiff("a\nb\nc", "a\nB\nc").map((l) => l.kind + l.text).join("|");
  });
  check(diff === " a|-b|+B| c", "one changed line is - then + (" + diff + ")");

  console.log("2. Menu item");
  const items = await page.evaluate(async () => {
    const { makeScriptHistoryItem } = await import("/ui/menuCmds.js");
    const a = makeScriptHistoryItem({ isScript: true, scriptPath: "/patterns/x/y.js", filename: "y" });
    const b = makeScriptHistoryItem({ isScript: false, scriptPath: "" });
    return { label: a.label, on: !a.disabled, off: b.disabled };
  });
  check(items.label === "Script history..." && items.on && items.off, "built for a script, greyed for a non-script");

  console.log("3. The panel");
  await page.evaluate(async (s) => {
    const { runScriptByPath } = await import("/ui/scriptRunner.js");
    await runScriptByPath(s, "canvas", { canvasRegionId: "sketchpad", enableControls: true });
  }, SCRIPT);
  await page.waitForTimeout(300);
  const atStart = await canvasPrint();
  await page.evaluate(async (s) => { (await import("/ui/scriptHistory.js")).openScriptHistory(s, "twoParabolas"); }, SCRIPT);
  await page.waitForSelector(".script-history-row", { timeout: 5000 });
  const rows = await page.locator(".script-history-row").allTextContents();
  check(rows.length === 2, "both saved versions are listed (" + rows.length + ")");

  console.log("4. Run an old version");
  await page.locator(".script-history-row").nth(1).getByRole("button", { name: "Run" }).click();
  await page.waitForTimeout(800);
  const oldPrint = await canvasPrint();
  check(oldPrint !== atStart, "the old version draws something different");
  const status = await page.locator("#offcanvasPanel").textContent();
  check(/Showing: the version saved .*The file is unchanged/.test(status), "the panel says which version is showing");
  check(fs.readFileSync(path.join(ROOT, SCRIPT), "utf8") === current, "the file on disk is unchanged");

  console.log("5. Diff");
  await page.locator(".script-history-row").nth(0).getByRole("button", { name: "Diff" }).click();
  await page.waitForTimeout(300);
  const shown = await page.locator("#scriptHistoryDiff").textContent();
  check(shown.includes("- " + stepsLine.replace(/numSteps\s*:\s*(\d+)/, (m, n) => "numSteps: " + (Number(n) + 7))) &&
        shown.includes("+ " + stepsLine), "the changed line is shown as - old and + new");

  console.log("6. Back to the file");
  await page.getByRole("button", { name: "Run the file as it is now" }).click();
  await page.waitForTimeout(800);
  check(await canvasPrint() === atStart, "the file draws as it did at the start");
  const errors = await page.evaluate(() => document.getElementById("errorBar").textContent);
  check(errors === "", "no errors reported" + (errors ? ": " + errors : ""));
} finally {
  await browser.close();
}

if (problems.length) { console.log("\nFAIL: " + problems.length + " problem(s)."); process.exit(1); }
console.log("\nPASS: Script history lists, runs, compares and goes back.");

// end scriptHistory.mjs
