/* ui/help.js
   ------------------------------------------------------------
   Help: load the help manifest, open the Help browser overlay,
   and build the per-tab Help menu item.

   Other parts:
     - ui/helpTree.js    the tree and the page pane (jsTree, jQuery)
     - ui/helpEditor.js  the page editor (TinyMCE), loaded on demand
*/

import { showHelpOverlay }  from "./overlay.js";
import { overlayManager }   from "./overlay.js";
import { buildHelpJsTreeData, initHelpJsTree, onHelpTreeNodeSelected,
         setHelpBrowserDefaultPage } from "./helpTree.js";

export let helpManifest = null;

export async function loadHelpManifest() {
  if (helpManifest !== null) return helpManifest;  // cached

  const resp = await fetch("/help/manifest.json");
  if (!resp.ok) {
    throw new Error("Missing or unreadable /help/manifest.json");
  }

  const data = await resp.json();

  if (typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Help manifest must be an object keyed by tab names");
  }

  helpManifest = data;
  return helpManifest;
} // end loadHelpManifest

// export function openHelpHomeOverlay() {
//   showHelpOverlay("/help/index.html", "", { allowEdit: false });
// } // end openHelpHomeOverlay

/* ============================================================
   openHelpHomeOverlay()
   ------------------------------------------------------------
   UPDATED:
   - This becomes the ONE entry point for opening Help.
   - It opens the existing Help overlay layer.
   - It immediately shows /help/index.html in the right pane.
   - It also initializes the Help Browser UI (jsTree on the left)
     using /help/manifest.json.

   NOTE:
   - This function now contains the code that would have been
     placed into a separate openHelpBrowserOverlay().

   - Adds <link rel="stylesheet" href="/help/help.css"> to the
     overlay content so the split-pane layout works.

   - Adds a wrapper class "helpBrowserOverlay" so you can size
     ONLY the Help Browser overlay panel via CSS without
     affecting other overlays.
============================================================ */

export function openHelpHomeOverlay() {

  // ----------------------------------------------------------
  // Ensure help.css is loaded for this overlay
  // ----------------------------------------------------------
  const cssId = "helpCssLink";

  let cssLink = document.getElementById(cssId);

  if (!cssLink) {
    cssLink = document.createElement("link");
    cssLink.id = cssId;
    cssLink.rel = "stylesheet";
    cssLink.href = "/help/help.css";
    document.head.appendChild(cssLink);
  }

  // ----------------------------------------------------------
  // Open overlay with Help Browser layout
  // ----------------------------------------------------------
  const browserHtml =
    "<div class='helpBrowserOverlay'>" +
      "<div id='helpBrowserWrap'>" +
        "<div id='helpBrowserLeft'>" +
          "<div id='helpTree'></div>" +
        "</div>" +
        "<div id='helpBrowserRight'>" +
          "<div id='helpViewer'></div>" +
        "</div>" +
      "</div>" +
    "</div>";

  overlayManager.show("help", browserHtml);

  // ----------------------------------------------------------
  // Force ONLY this overlay panel to be larger (deterministic)
  // ----------------------------------------------------------
  const overlayPanel = document.getElementById("overlayPanel");
  if (!overlayPanel) throw new Error("openHelpHomeOverlay: #overlayPanel missing");

  overlayPanel.classList.add("helpBrowserPanel");

  // Inline style overrides overlay.css reliably.
  overlayPanel.style.width = "90vw";
  overlayPanel.style.height = "80vh";
  overlayPanel.style.maxWidth = "90vw";
  overlayPanel.style.maxHeight = "80vh";

  // ----------------------------------------------------------
  // Standard overlay header + show
  // ----------------------------------------------------------
  const header = document.getElementById("overlayTitle");
  if (!header) throw new Error("openHelpHomeOverlay: #overlayTitle missing");
  header.textContent = "Help";

  const container = document.getElementById("overlayContainer");
  if (!container) throw new Error("openHelpHomeOverlay: #overlayContainer missing");
  container.style.display = "block";

  // ----------------------------------------------------------
  // Default startup page + jsTree init
  // ----------------------------------------------------------
  setHelpBrowserDefaultPage();

  loadHelpManifest().then((helpData) => {

    const treeData = buildHelpJsTreeData(helpData);

    initHelpJsTree(
      document.getElementById("helpTree"),
      treeData,
      onHelpTreeNodeSelected
    );

  });

} // end openHelpHomeOverlay

/* ============================================================
   buildHelpItem

   PURPOSE
   -------
   Build a Help menu item ("Help" or "Create Help") using a
   recursive manifest tree.

   THIS VERSION FIXES
   ------------------
   - Works with BOTH manifest shapes:
       A) leaf array tabs:  { draw: ["inEllipse", ...] }
       B) recursive tree:   { gallery: { Scripts: { Elliptical: ["ellipseDemo.js"] } } }

   - Traverses arbitrary depth safely and deterministically.
   - Does NOT invent ids.
   - Correctly builds helpPath for nested dirs.
   - Caller can pass either:
       • options.subdirs : ["Scripts","Elliptical"]
     OR
       • options.path    : ["gallery","Scripts","Elliptical"]  (tabName ignored)

   RULES
   -----
   - helpKey is the leaf item key from the manifest leaf array.
   - Help file is always: /help/<tab>/<subdirs...>/<helpKey>.html

   - It MUST NOT launch the Help Browser tree UI.
   - It continues to return { label, onClick } for showHelpOverlay.
============================================================ */
export async function buildHelpItem(tabName, helpKey, options = {}) {

  if (!helpKey) throw new Error("buildHelpItem: helpKey missing");

  const helpData = await loadHelpManifest();   // cached, deterministic

  // ------------------------------------------------------------
  // Resolve traversal path
  // ------------------------------------------------------------
  let pathParts = null;

  if (options && Array.isArray(options.path)) {
    pathParts = options.path.slice();  // full path INCLUDING tabName
  } else {
    if (!tabName) throw new Error("buildHelpItem: tabName missing");
    const subdirs = (options && Array.isArray(options.subdirs)) ? options.subdirs : [];
    pathParts = [tabName].concat(subdirs);
  }

  if (pathParts.length < 1) throw new Error("buildHelpItem: pathParts empty");

  const tabRoot = pathParts[0];
  if (!tabRoot) throw new Error("buildHelpItem: tab root missing");

  // ------------------------------------------------------------
  // Traverse manifest tree to the leaf node
  // ------------------------------------------------------------
  let node = helpData;

  for (let i = 0; i < pathParts.length; i++) {

    const seg = pathParts[i];
    if (!seg) throw new Error("buildHelpItem: empty path segment");

    if (!node || typeof node !== "object") {
      throw new Error("buildHelpItem: manifest traversal failed at: " + seg);
    }

    node = node[seg];
  }

  // Leaf must be an array of items (filenames or ids)
  const exists = Array.isArray(node) ? node.includes(helpKey) : false;

  // ------------------------------------------------------------
  // Build helpPath: /help/<tab>/<subdirs...>/<helpKey>.html
  // ------------------------------------------------------------
  const subdirs = pathParts.slice(1);

  const parts = ["", "help", tabRoot];

  for (let i = 0; i < subdirs.length; i++) {
    const seg = subdirs[i];
    if (!seg) throw new Error("buildHelpItem: empty subdir segment");
    parts.push(seg);
  }

  parts.push(helpKey + ".html");

  const helpPath = parts.join("/");

  // ------------------------------------------------------------
  // IMPORTANT:
  // This function MUST remain caption-menu oriented.
  // It MUST NOT launch the Help Browser overlay.
  // ------------------------------------------------------------
  if (!exists) {
    return {
      label: "Create Help",
      onClick: () => showHelpOverlay(helpPath, helpKey, { createIfMissing: true })
    };
  }

  return {
    label: "Help",
    onClick: () => showHelpOverlay(helpPath, helpKey)
  };

} // end buildHelpItem
