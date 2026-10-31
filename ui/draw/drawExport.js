/* ===========================================================
   drawExport.js
   -----------------------------------------------------------
   Draw's export requests to the Node service: Gallery PNG and Pattern script (text built from
   the Draw registry object). Used only by Draw. (Saved settings are in ui/draw/secondaryObjects.js.)
   =========================================================== */

import { nodeDispatch } from "/ui/nodeLayer.js";
import { buildCanvasThumbnailBase64 } from "/ui/thumbnails.js";
import { manifest } from "/ui/manifest.js";

/*************************************************************
    createGalleryPatternPng(spec)
    -----------------------------------------------------------
    Worker for creating a PNG + thumbnail from a canvas and
    writing both under:
      /gallery/Patterns/<category>/

    Expected spec:
      {
        category : "<category>",
        id       : "<base id>",
        canvas   : HTMLCanvasElement
      }
*************************************************************/
/* ============================================================
    createGalleryPatternPng(spec)
    ------------------------------------------------------------
    UI worker for "Create PNG" (Draw tab).

    Responsibilities:
      1) Validate spec + canvas
      2) Convert canvas to PNG base64 + 50x50 thumb base64
      3) Dispatch Node request: writeGalleryPatternPng
      4) Force manifest refresh (same pattern as archive/edit)
      5) Display a clear completion message

    NOTE
    ----
    - Thumbnail is written under:
        /gallery/Patterns/<category>/images/thumb_<id><stamp>.png
    - Full PNG is written under:
        /gallery/Patterns/<category>/<id><stamp>.png
=========================================================== */

/* ============================================================
    createGalleryPatternPng(spec)
    ------------------------------------------------------------
    UI worker for "Create PNG" (Draw tab).
=========================================================== */
export async function createGalleryPatternPng(spec = {}) {

  const category = spec.category;
  const idName   = spec.idName;
  const canvas   = spec.canvas;

  // 1. Validation
  if (typeof category !== "string" || category.trim() === "") {
    throw new Error("createGalleryPatternPng: category missing/invalid");
  }
  if (typeof idName !== "string" || idName.trim() === "") {
    throw new Error("createGalleryPatternPng: idName missing/invalid");
  }
  if (!canvas || !canvas.toDataURL) {
    throw new Error("createGalleryPatternPng: canvas missing or invalid");
  }

  // 2. Generate Full PNG Base64 (The complete drawing)
  const dataUrl = canvas.toDataURL("image/png");
  const pngBase64 = dataUrl.split(",")[1];

  // 3. Generate Cropped Thumbnail Base64 (Using the shared utility)
  const thumbBase64 = buildCanvasThumbnailBase64(canvas, 50, 50);

  const payload = {
    category: category,
    idName:   idName,
    pngBase64: pngBase64,
    thumbBase64: thumbBase64
  };

  // 4. Dispatch to Node service
  const result = await nodeDispatch("writeGalleryPatternPng", payload);

  if (!result || result.status !== "ok") {
    throw new Error("createGalleryPatternPng: service failed: " + JSON.stringify(result));
  }

  // 5. Invalidate manifest cache
  manifest.invalidate("gallery/Patterns");

  // 6. User Feedback
  alert(
    "PNG and written: " +
    result.pngPath +
    "\nThumbnail: " +
    result.thumbPath
  );

  return result;

} // end createGalleryPatternPng

/* ============================================================
    createPatternScript(spec)
    ------------------------------------------------------------
    UI worker for Draw command "Create Pattern".

    Responsibilities:
      1) Validate spec
      2) Build pattern .js source text from drawRegistry entry+params
      3) Dispatch Node request: writePatternScriptFromDraw
      4) Invalidate manifest cache (patterns)
      5) Alert what was created
============================================================ */
export async function createPatternScript(spec = {}) {

  const category = spec.category;
  const idName   = spec.idName;

  if (typeof category !== "string" || category.trim() === "") {
    throw new Error("createPatternScript: category missing/invalid");
  }

  if (typeof idName !== "string" || idName.trim() === "") {
    throw new Error("createPatternScript: idName missing/invalid");
  }

  // We do NOT send entry/params to the service.
  // We generate the script text here in the UI.
  const scriptText = createPatternScriptTextFromDrawRegistry({
    category:     category,
    idName:       idName,
    parameters:   spec.params
  });

  // We DO send thumbBase64 to the service.
  // Service writes: /patterns/<category>/images/thumb_<id><stamp>.png
  const canvas = window.drawCanvas;
  if (!canvas || !canvas.toDataURL) {
    throw new Error("createPatternScript: window.drawCanvas missing/invalid");
  }

  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width  = 50;
  thumbCanvas.height = 50;

  const tctx = thumbCanvas.getContext("2d");
  if (!tctx) throw new Error("createPatternScript: thumb 2d context missing");

  tctx.clearRect(0, 0, 50, 50);
  tctx.drawImage(canvas, 0, 0, 50, 50);

  const thumbUrl = thumbCanvas.toDataURL("image/png");
  const thumbParts = thumbUrl.split(",");
  if (thumbParts.length !== 2) throw new Error("createPatternScript: invalid thumb data URL");
  const thumbBase64 = thumbParts[1];

  const payload = {
    category:     category,
    idName:       idName,
    scriptText:   scriptText,
    thumbBase64: thumbBase64
  };

  const result = await nodeDispatch("writePatternFromDrawRegistry", payload);

  if (!result || result.status !== "ok") {
    throw new Error("createPatternScript: service failed: " + JSON.stringify(result));
  }

  // Invalidate manifest cache so Patterns picks up the new entry deterministically
  manifest.invalidate("patterns");

  alert(
    "Pattern created:\n" +
    result.scriptPath +
    "\n\nThumbnail:\n" +
    result.thumbPath +
    "\n\nManifest:\n" +
    result.manifestPath
  );

  return result;

} // end createPatternScript

/* ============================================================
    createPatternScriptTextFromDrawRegistry(entry, params)

    Produces a Patterns-style script file:

      export function runPattern() {
        const s = {...}
        const thing = new <Shape>(s)
        <drawFn>(thing)
      }

    This first cut assumes:
      - entry.elements.thing exists after init()
      - thing.constructor.name is the class name
      - entry.draw() can be reproduced by calling the common
        "drawXxx(thing)" function that already exists for that class
        (this is true for your ellipse example, and for early tests)

    If your drawRegistry item does not follow this, we will extend
    the builder with per-id overrides.
============================================================ */

function createPatternScriptTextFromDrawRegistry(spec) {

  if (!spec) throw new Error("createPatternScriptTextFromDrawRegistry: spec missing");

  // Accept BOTH naming conventions:
  //   - idName (preferred) or id (older menuContext style)
  //   - parameters (preferred) or params (drawRegistry vocabulary)
  const category   = spec.category;
  const idName     = spec.idName || spec.id;
  const parameters = spec.parameters || spec.params;

  if (typeof category !== "string" || category.trim() === "") {
    throw new Error("createPatternScriptTextFromDrawRegistry: spec.category missing/invalid");
  }

  if (typeof idName !== "string" || idName.trim() === "") {
    throw new Error("createPatternScriptTextFromDrawRegistry: spec.idName missing/invalid");
  }

  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    throw new Error("createPatternScriptTextFromDrawRegistry: spec.parameters missing/invalid");
  }

  const paramsJson = JSON.stringify(parameters, null, 2);

  const lines = [];

  lines.push("/* ===========================================================");
  lines.push("   GENERATED PATTERN (from Draw / drawRegistry)");
  lines.push("   -----------------------------------------------------------");
  lines.push("   Category: " + category);
  lines.push("   drawRegistry id: " + idName);
  lines.push("   Notes:");
  lines.push("     - This file is generated from the CURRENT Draw parameters.");
  lines.push("     - It rehydrates by importing the drawRegistry module and");
  lines.push("       then applying the saved params.");
  lines.push("=========================================================== */");
  lines.push("");

  // Patterns/<cat>/<file>.js -> ../../drawRegistry/<idName>.js
  lines.push(`import "../../drawRegistry/${idName}.js";`);
  lines.push("");

  lines.push("export function runPattern() {");
  lines.push(`  const entry = window.drawRegistry["${idName}"];`);
  lines.push(`  if (!entry) throw new Error("runPattern: window.drawRegistry['${idName}'] missing");`);
  lines.push("");
  lines.push("  // Saved parameters from the Draw tab (current state)");
  lines.push("  const s = " + paramsJson.replace(/\n/g, "\n  ") + ";");
  lines.push("");
  lines.push("  // Apply params + redraw deterministically");
  lines.push("  entry.params = s;");
  lines.push("  entry.init();");
  lines.push("  entry.update(entry.params);");
  lines.push("  entry.draw();");
  lines.push("");
  lines.push("} // end runPattern");
  lines.push("");

  return lines.join("\n");

} // end createPatternScriptTextFromDrawRegistry
