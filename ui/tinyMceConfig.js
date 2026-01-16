/* ui/tinyMceConfig.js
   ------------------------------------------------------------
   TinyMCE Configuration (Shared)
   ------------------------------------------------------------
   Purpose:
     - Centralize TinyMCE init settings so every editor instance
       looks and behaves the same across Sketchpad.
     - Used by Help Edit (Step 1) and Help Create (Step 2).

   Notes:
     - This file ONLY defines config. It does not call tinymce.init().
     - The caller supplies the target selector (and any overrides).
   ------------------------------------------------------------
*/

/* ============================================================
   getTinyMceConfig(overrides)
   ------------------------------------------------------------
   Returns a TinyMCE init config object.

   Caller must provide at least:
     selector: "#someTextAreaId"

   Optional overrides may include:
     height, menubar, toolbar, plugins, etc.

   NEW (Step 1b sizing):
     - If caller does not supply width/height, we default larger:
         width:  "100%"
         height: 900
============================================================ */
export function getTinyMceConfig(overrides = {}) {

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


// end tinyMceConfig.js
