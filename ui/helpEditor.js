/* ===========================================================
   helpEditor.js
   -----------------------------------------------------------
   The help page editor (TinyMCE): open it on a page or empty, and save through the Node service
   ("writeHelpFile"). Loaded on demand by overlay.js, so TinyMCE is not fetched until a help page is edited.
   =========================================================== */

import tinymce from "tinymce/tinymce";
import "tinymce/icons/default";
import "tinymce/themes/silver";
import "tinymce/models/dom";
import "tinymce/skins/ui/oxide/skin.min.css";

import { nodeDispatch }    from "./nodeLayer.js";
import { escapeHtml }      from "/ui/htmlText.js";
import { showHelpOverlay } from "./overlay.js";
import { overlayManager }  from "./overlay.js";

/* ============================================================
   buildFullHelpHtmlDocument(titleText, fileName, bodyHtml)

   Builds a complete HTML document for saving.

   Rules:
     - <title> uses titleText if provided, else fileName
     - Includes /help/help.css
     - bodyHtml is written BETWEEN <body> tags
============================================================ */
function buildFullHelpHtmlDocument(titleText, fileName, bodyHtml) {

  const title = String(titleText || "").trim() || String(fileName || "").trim() || "Help";

  if (bodyHtml === undefined || bodyHtml === null) {
    throw new Error("buildFullHelpHtmlDocument: bodyHtml missing");
  }

  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head>",
    "  <meta charset=\"utf-8\" />",
    "  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />",
    "  <title>" + escapeHtml(title) + "</title>",
    "  <link rel=\"stylesheet\" href=\"/help/help.css\" />",
    "</head>",
    "<body>",
    bodyHtml,
    "</body>",
    "</html>",
    ""
  ].join("\n");

} // end buildFullHelpHtmlDocument

/* ============================================================
   getTinyMceConfig(overrides)
   ============================================================
   Returns a TinyMCE init config object. Private to this module.
   Merged from tinyMceConfig.js — only ever used by
   openHelpEditorTinyMCE() in this file.
   ============================================================ */
function getTinyMceConfig(overrides = {}) {

  if (!overrides) {
    throw new Error("getTinyMceConfig: overrides missing");
  }

  if (!overrides.selector) {
    throw new Error("getTinyMceConfig: overrides.selector missing");
  }

  const base = {

    // REQUIRED: where to attach TinyMCE
    selector: overrides.selector,

    // REQUIRED (Vite + npm TinyMCE):
    // You copied TinyMCE runtime assets into /public/tinymce
    // so TinyMCE must load plugins/skins/themes/icons/models from there.
    base_url: "/tinymce",

    // REQUIRED (otherwise TinyMCE disables itself):
    license_key: "gpl",

    // REQUIRED (explicit script URL for the served TinyMCE core):
    tinymceScriptSrc: "/tinymce/tinymce.min.js",

    // Core behavior
    branding: false,
    promotion: false,
    statusbar: true,
    resize: true,

    // Editor sizing (bigger by default for Help editing)
    width: "100%",
    height: 900,

    // You said you want both menubar and toolbar for now.
    menubar: true,

    // Minimal but useful set of plugins (can be trimmed later)
    plugins: [
      "lists",
      "link",
      "table",
      "code",
      "help"
    ],

    // Toolbar (simple + predictable)
    toolbar: [
      "undo redo |",
      "blocks |",
      "bold italic underline |",
      "bullist numlist |",
      "outdent indent |",
      "link table |",
      "removeformat |",
      "code"
    ].join(" "),

    // Menubar layout (simple, familiar)
    menu: {
      file:   { title: "File",   items: "newdocument" },
      edit:   { title: "Edit",   items: "undo redo | cut copy paste | selectall" },
      view:   { title: "View",   items: "code | visualaid" },
      insert: { title: "Insert", items: "link table" },
      format: { title: "Format", items: "bold italic underline | removeformat" },
      tools:  { title: "Tools",  items: "help" }
    },

    // Keep output clean and predictable for your Help files
    elementpath: true,
    browser_spellcheck: true,

    // You said you won't be using a lot of HTML.
    // This keeps things conservative, but not overly restrictive yet.
    valid_elements: "*[*]",
    forced_root_block: "p",

    // Don’t auto-insert weird stuff
    convert_urls: false

  };

  // Apply caller overrides last (explicit wins)
  const finalConfig = Object.assign({}, base, overrides);

  return finalConfig;

} // end getTinyMceConfig

/* ============================================================
   openHelpEditorTinyMCE(helpPath, titleText, options)
   ------------------------------------------------------------
   Reuses the SAME help overlay layer.
   Displays TinyMCE editor and loads initial body HTML (if any).

   options:
     {
       initialBodyHtml : "<html inside body>..."
     }

   CREATE MODE FIX:
     - If options.createMode === true:
         - do NOT fetch helpPath
         - open an EMPTY TinyMCE editor immediately
         - Save stays enabled (wired the same as edit mode)

   EDIT MODE:
     - Fetch helpPath
     - Extract <body> inner HTML
     - Load it into TinyMCE

   - Cancel returns to the single-page help overlay.
   - Save writes the file then returns to single-page help view.
   - This function MUST NOT launch the Help Browser tree UI.
============================================================ */
export function openHelpEditorTinyMCE(helpPath, titleText, options = {}) {

  if (!helpPath) throw new Error("openHelpEditorTinyMCE: helpPath missing");
  if (!titleText) throw new Error("openHelpEditorTinyMCE: titleText missing");

  // Single source of truth:
  // - Create Help passes initialBodyHtml: ""  (empty editor)
  // - Edit passes initialBodyHtml: "<body inner html>" (preloaded)
  const initialBodyHtml =
    (options && typeof options.initialBodyHtml === "string")
      ? options.initialBodyHtml
      : "";

  const editorHtml =
    "<div class='helpEditorToolbar'>" +
      "<button id='helpSaveButton' type='button'>Save</button>" +
      "<button id='helpCancelButton' type='button'>Cancel</button>" +
    "</div>" +
    "<div class='helpEditorWrap'>" +
      "<textarea id='helpEditorArea'></textarea>" +
    "</div>";

  overlayManager.show("help", editorHtml);

  const header = document.getElementById("overlayTitle");
  if (!header) throw new Error("openHelpEditorTinyMCE: #overlayTitle missing");
  header.textContent = titleText + " Help (Edit)";

  const container = document.getElementById("overlayContainer");
  if (!container) throw new Error("openHelpEditorTinyMCE: #overlayContainer missing");
  container.style.display = "block";

  const cfg = getTinyMceConfig({
    selector: "#helpEditorArea",
    height: 900,
    width: "100%",
    menubar: true
  });

  // Ensure we do not accumulate editors
  tinymce.remove();

  tinymce.init(cfg).then(() => {

    const ed = tinymce.get("helpEditorArea");
    if (!ed) throw new Error("openHelpEditorTinyMCE: tinymce editor not found");

    // Create Help => "" ; Edit => bodyHtml
    ed.setContent(initialBodyHtml);

    const saveBtn = document.getElementById("helpSaveButton");
    const cancelBtn = document.getElementById("helpCancelButton");
    if (!saveBtn) throw new Error("openHelpEditorTinyMCE: #helpSaveButton missing");
    if (!cancelBtn) throw new Error("openHelpEditorTinyMCE: #helpCancelButton missing");

    cancelBtn.onclick = () => {
      tinymce.remove(ed);
      showHelpOverlay(helpPath, titleText, { createIfMissing: true });
    }; // end onclick

    saveBtn.onclick = async () => {

      const bodyHtml = ed.getContent();

      await saveHelpFile(helpPath, titleText, bodyHtml);

      tinymce.remove(ed);
      showHelpOverlay(helpPath, titleText);

    }; // end onclick

  });

} // end openHelpEditorTinyMCE

/* ============================================================
   saveHelpFile(helpPath, titleText, bodyHtml)
   ------------------------------------------------------------
   Writes Help HTML via Node dispatch:
     request: "writeHelpFile"
     payload: { helpPath, html }

   bodyHtml must be the INNER <body> HTML (TinyMCE content).
============================================================ */
async function saveHelpFile(helpPath, titleText, bodyHtml) {

  if (!helpPath) throw new Error("saveHelpFile: helpPath missing");
  if (!titleText) throw new Error("saveHelpFile: titleText missing");
  if (bodyHtml === undefined || bodyHtml === null) throw new Error("saveHelpFile: bodyHtml missing");

  // derive a fallback filename for <title> if needed
  const parts = String(helpPath).split("/");
  const fileName = parts[parts.length - 1] || "Help";

  const fullHtml = buildFullHelpHtmlDocument(titleText, fileName, String(bodyHtml));

  const payload = {
    helpPath: helpPath,
    html: fullHtml
  };

  const result = await nodeDispatch("writeHelpFile", payload);

  if (!result) throw new Error("saveHelpFile: writeHelpFile returned null/undefined");
  if (result.status !== "ok") throw new Error("saveHelpFile: writeHelpFile failed: " + JSON.stringify(result));
  if (result.request !== "writeHelpFile") throw new Error("saveHelpFile: unexpected response: " + JSON.stringify(result));

  return result;

} // end saveHelpFile
