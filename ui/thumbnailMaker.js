/* ui/thumbnailMaker.js
   ------------------------------------------------------------
   Makes the thumbnail pictures shown in the category lists, and checks
   which ones are missing. Used by the Utilities > Tools > Thumbnails tools
   ("Regenerate thumbnails" and "Check Missing Images").

   Each item that has a picture is a "target":
     { set, kind, domain, category, name, source, sourcePath, thumbUrl }
   set        "Patterns", "Gallery scripts", "Gallery images", "Draw" or "Figures"
   kind       the folder family the Node service writes to (writeThumbnail)
   source     how the picture is made: "script" (run it), "image" (shrink the
              file), "draw" (draw the registry object with its defaults), or
              "figure" (draw the saved figure as Show All does)

   A picture is made by drawing the item on the shared canvas, cropping the
   blank margin, scaling to THUMB_FILE_SIZE and sending it to the Node
   service. Nothing is kept on the page afterwards.

   Scripts that animate (they use requestAnimationFrame or setInterval) are
   skipped, because a single picture of them is not reliable and their timers
   would keep drawing over the next picture. A script that throws is listed in
   the report with its message and the run goes on. The drawing state that
   survives between scripts (see the notes on resetCanvas) can make a few
   scripts fail late in a long run; run the set again after reloading the page.

   Exports:
     THUMB_SETS                  the set names, in the order the tools list them
     listThumbnailTargets(sets)  the targets for the chosen sets
     regenerateThumbnails(sets, onProgress, onlyTargets)   make and write them all (or only the targets given)
     findMissingThumbnails(sets, onProgress)  which picture files do not exist
   ------------------------------------------------------------ */

import { manifest }              from "/ui/manifest.js";
import { nodeDispatch }          from "/ui/nodeLayer.js";
import { loadScriptModule, executeScriptToCanvas } from "/ui/scriptRunner.js";
import { resetCanvas }           from "/draw/drawState.js";
import { disarmInteractor }      from "/ui/interactor.js";
import { buildCanvasThumbnailBase64 } from "/ui/thumbnails.js";
import { uiState }               from "/ui/uiState.js";
import { THUMB_FILE_SIZE, patternsThumb, galleryThumb, figureThumb, drawThumb } from "/ui/thumbnailSettings.js";

export const THUMB_SETS = ["Patterns", "Gallery scripts", "Gallery images", "Draw", "Figures"];

const ANIMATED = /requestAnimationFrame|setInterval/;


/* ------------------------------------------------------------
   listThumbnailTargets(sets)
   ------------------------------------------------------------ */
/* listThumbnailTargets: every item that should have a thumbnail, in the sets chosen (Patterns, Gallery, Draw,
   Figures). */
export async function listThumbnailTargets(sets = THUMB_SETS) {

  const targets = [];
  const want = (name) => sets.includes(name);

  if (want("Patterns")) {
    await manifest.get("patterns");
    const map = manifest.getCategoryMap("patterns");
    for (const category of Object.keys(map)) {
      for (const e of map[category]) {
        targets.push({ set: "Patterns", kind: "patterns", category, name: e.filename, source: "script",
                       sourcePath: "/patterns/" + category + "/" + (e.path || e.filename + ".js"),
                       thumbUrl: patternsThumb(category, e.filename) });
      }
    }
  }

  if (want("Gallery scripts")) {
    await manifest.get("gallery/Scripts");
    const map = manifest.getCategoryMap("gallery/Scripts");
    for (const category of Object.keys(map)) {
      for (const e of map[category]) {
        targets.push({ set: "Gallery scripts", kind: "gallery", domain: "Scripts", category, name: e.filename, source: "script",
                       sourcePath: "/gallery/Scripts/" + category + "/" + (e.path || e.filename + ".js"),
                       thumbUrl: galleryThumb("Scripts", category, e.filename) });
      }
    }
  }

  if (want("Gallery images")) {
    for (const domain of ["Ideabook", "Patterns"]) {
      await manifest.get("gallery/" + domain);
      const map = manifest.getCategoryMap("gallery/" + domain);
      for (const category of Object.keys(map)) {
        for (const e of map[category]) {
          if (!e.path) continue;
          targets.push({ set: "Gallery images", kind: "gallery", domain, category, name: e.filename, source: "image",
                         sourcePath: "/gallery/" + domain + "/" + category + "/" + e.path,
                         thumbUrl: galleryThumb(domain, category, e.filename) });
        }
      }
    }
  }

  if (want("Draw")) {
    for (const key of Object.keys(window.drawRegistry || {})) {
      if (!window.drawRegistry[key] || window.drawRegistry[key].template) continue;   // Figures guide shapes have no picture
      targets.push({ set: "Draw", kind: "drawRegistry", category: key, name: key, source: "draw", sourcePath: key,
                     thumbUrl: drawThumb(key) });
    }
  }

  if (want("Figures")) {
    const reg = await fetchJson("/figures/directoryRegistry.json");
    for (const category of Array.isArray(reg) ? reg : []) {
      const list = await fetchJson("/figures/" + encodeURIComponent(category) + "/manifest.json");
      for (const e of Array.isArray(list) ? list : []) {
        const file = e.path || (e.filename + ".json");
        targets.push({ set: "Figures", kind: "figures", category, name: file.replace(/\.json$/i, ""), source: "figure",
                       sourcePath: "/figures/" + encodeURIComponent(category) + "/" + encodeURIComponent(file),
                       thumbUrl: figureThumb(category, file.replace(/\.json$/i, "")) });
      }
    }
  }

  return targets;

} // end listThumbnailTargets


/* fetchJson: a JSON file's contents, or null if it cannot be read. */
async function fetchJson(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    return res.ok ? await res.json() : null;
  } catch (err) {
    return null;
  }
} // end fetchJson


/* ------------------------------------------------------------
   regenerateThumbnails(sets, onProgress)
   Makes every picture again, replacing the old ones (or only the targets
   handed in as onlyTargets, for "make the missing ones"). onProgress is
   called after each target as (done, total, target). Returns
   { made, skipped: [{ target, why }], failed: [{ target, message }] }.
   ------------------------------------------------------------ */
export async function regenerateThumbnails(sets, onProgress, onlyTargets = null) {

  // onlyTargets: a list of targets (as findMissingThumbnails returns them) to make; the rest are left alone.
  const targets = onlyTargets || await listThumbnailTargets(sets);
  const result = { made: 0, skipped: [], failed: [] };

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    try {
      const canvas = await renderTarget(t);
      if (canvas === null) {
        result.skipped.push({ target: t, why: "animated" });
      } else {
        const pngBase64 = buildCanvasThumbnailBase64(canvas, THUMB_FILE_SIZE, THUMB_FILE_SIZE);
        await nodeDispatch("writeThumbnail", { kind: t.kind, domain: t.domain, category: t.category, name: t.name, pngBase64 });
        result.made++;
      }
    } catch (err) {
      result.failed.push({ target: t, message: String(err && err.message || err) });
    }
    disarmInteractor();                                     // a script may have armed handles
    if (onProgress) onProgress(i + 1, targets.length, t);
    await new Promise((r) => setTimeout(r, 0));             // let the page breathe
  }

  return result;

} // end regenerateThumbnails


/* ------------------------------------------------------------
   findMissingThumbnails(sets, onProgress)
   Asks for each picture file. Vite answers a missing file with the app's
   home page, so a reply counts only if it is an image.
   Returns { total, missing: [target, ...] }.
   ------------------------------------------------------------ */
export async function findMissingThumbnails(sets, onProgress) {

  const targets = await listThumbnailTargets(sets);
  const missing = [];

  for (let i = 0; i < targets.length; i++) {
    let ok = false;
    try {
      const res = await fetch(targets[i].thumbUrl, { cache: "no-store" });
      ok = res.ok && (res.headers.get("content-type") || "").startsWith("image/");
    } catch (err) {
      ok = false;
    }
    if (!ok) missing.push(targets[i]);
    if (onProgress) onProgress(i + 1, targets.length, targets[i]);
  }

  return { total: targets.length, missing };

} // end findMissingThumbnails


/* ------------------------------------------------------------
   renderTarget(t)
   Draws the target on the shared canvas and returns the canvas, or
   null when the target is skipped.
   ------------------------------------------------------------ */
async function renderTarget(t) {

  if (t.source === "script") {
    const src = await (await fetch(t.sourcePath, { cache: "no-store" })).text();
    if (ANIMATED.test(src)) return null;
    const mod = await loadScriptModule(t.sourcePath);
    await executeScriptToCanvas(mod, t.name, { canvasRegionId: "sketchpad", enableControls: false });
    if (typeof mod.stop === "function") mod.stop();       // a script that keeps a timer is told to stop
    return window.drawCanvas;
  }

  if (t.source === "image") {
    const img = await loadImage(encodeURI(t.sourcePath));
    const canvas = document.createElement("canvas");
    canvas.width = 800; canvas.height = 800;
    const c = canvas.getContext("2d");
    c.fillStyle = "#ffffff"; c.fillRect(0, 0, 800, 800);
    const scale = Math.min(800 / img.naturalWidth, 800 / img.naturalHeight);
    const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
    c.drawImage(img, (800 - w) / 2, (800 - h) / 2, w, h);
    return canvas;
  }

  if (t.source === "draw") {
    const entry = window.drawRegistry[t.sourcePath];
    prepareSharedCanvas();
    const inst = Object.create(entry);               // a private copy, as a figure layer is made
    inst.params   = structuredClone(entry.params);
    inst.elements = null;
    inst.init();
    inst.update(inst.params);
    inst.draw();
    return window.drawCanvas;
  }

  if (t.source === "figure") {
    const figure = await (await fetch(t.sourcePath, { cache: "no-store" })).json();
    const fig  = await import("/ui/figures/figureLayers.js");
    const draw = await import("/ui/figures/figureDraw.js");
    const tabId = "tab-thumbnail-temp";
    prepareSharedCanvas();
    uiState.figures.tabs[tabId] = { type: "figure", figure, mode: "lines", preview: true, selectedPoint: null, centroidSelected: false };
    try {
      fig.rebuildInstances(tabId);
      draw.redrawFigure(tabId);
    } finally {
      delete uiState.figures.tabs[tabId];
    }
    return window.drawCanvas;
  }

  throw new Error("renderTarget: unknown source " + t.source);

} // end renderTarget


// Puts the shared canvas in #sketchpad on a white page, as running a script does.
function prepareSharedCanvas() {
  const host = document.getElementById("sketchpad");
  if (!host || !window.drawCanvas) throw new Error("The shared canvas is not available on this tab.");
  const wrapper = document.getElementById("sketchpad-wrapper");
  if (wrapper) wrapper.style.display = "flex";
  host.innerHTML = "";
  host.appendChild(window.drawCanvas);
  resetCanvas();
  const c = window.drawCanvas.getContext("2d");
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, window.drawCanvas.width, window.drawCanvas.height);
} // end prepareSharedCanvas


/* loadImage: a picture loaded into an Image, when it has loaded. */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error("could not read the picture " + src));
    img.src = src;
  });
} // end loadImage

// end thumbnailMaker.js
