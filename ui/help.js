/* ============================================================
   jQuery + jsTree imports for Vite/npm.

   This ensures:
     - jQuery exists
     - jsTree registers as a jQuery plugin
     - window.$ is available for the existing code
============================================================ */

import $ from "jquery";
import "jstree";
import "jstree/dist/themes/default/style.css";

import tinymce from "tinymce/tinymce";
import "tinymce/icons/default";
import "tinymce/themes/silver";
import "tinymce/models/dom";
import "tinymce/skins/ui/oxide/skin.min.css";

import { nodeDispatch }     from "./nodeLayer.js";
import { escapeHtml }       from "./uiUtilities.js";
import { getTinyMceConfig } from "./tinyMceConfig.js";
import { showHelpOverlay }  from "./overlay.js";
import { overlayManager } from "./overlay.js";

/* Make jQuery available globally (so existing code can use window.$) */
window.$ = $;
window.jQuery = $;

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










/* ============================================================
   extractBodyInnerHtml(htmlText)
   ------------------------------------------------------------
   Returns the HTML found BETWEEN <body> ... </body>.

   Fail-fast:
     - throws if input is missing
     - throws if DOMParser fails to produce a body element
============================================================ */
function extractBodyInnerHtml(htmlText) {

  if (!htmlText) throw new Error("extractBodyInnerHtml: htmlText missing");

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, "text/html");

  if (!doc) throw new Error("extractBodyInnerHtml: parse failed");
  if (!doc.body) throw new Error("extractBodyInnerHtml: doc.body missing");

  return doc.body.innerHTML;

} // end extractBodyInnerHtml


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


/* ============================================================
   destroyHelpJsTree()
   ------------------------------------------------------------
   Destroys any existing jsTree instance and unhooks events.

   This prevents duplicate initialization when Help is opened
   repeatedly.
============================================================ */
function destroyHelpJsTree() {

  const treeEl = document.getElementById("helpTree");
  if (!treeEl) return;  // if overlay not open, nothing to destroy

  const $host = window.$(treeEl);
  if (!$host) return;

  // If jsTree was initialized, destroy it.
  // jstree(true) returns the instance or false.
  const inst = $host.jstree(true);
  if (inst) {
    $host.off("select_node.jstree");
    $host.jstree("destroy");
  }

} // end destroyHelpJsTree

/* ============================================================
   buildHelpJsTreeData(helpManifest)
   ------------------------------------------------------------
   Converts the hierarchical help manifest into jsTree data.

   Rules:
     - Manifest order is preserved (NO sorting).
     - Each jsTree node gets:
         { id, text, children, helpPath? }
     - helpPath is present only on "leaf" nodes that map to an
       actual help HTML file.

   Returns:
     jsTreeDataArray

  prunes empty branches first.
============================================================ */
function buildHelpJsTreeData(helpManifest) {

  if (!helpManifest) throw new Error("buildHelpJsTreeData: helpManifest missing");
  if (typeof helpManifest !== "object" || Array.isArray(helpManifest)) {
    throw new Error("buildHelpJsTreeData: helpManifest must be an object");
  }

  const pruned = pruneEmptyHelpManifest(helpManifest);
  if (!pruned) throw new Error("buildHelpJsTreeData: manifest pruned to nothing");

  const treeData = [];
  let idSeed = 1;

  for (const topKey in pruned) {
    const res = manifestNodeToJsTreeNode(topKey, pruned[topKey], [topKey], idSeed);
    if (res.node !== null) treeData.push(res.node);
    idSeed = res.nextIdSeed;
  }

  return treeData;

} // end buildHelpJsTreeData


/* ============================================================
   manifestNodeToJsTreeNode(nodeKey, nodeValue, pathParts, idSeed)
   ------------------------------------------------------------
   Recursive converter from manifest subtree to a jsTree node.

   Inputs:
     nodeKey   : the name of this node in the manifest
     nodeValue : array | object | empty
     pathParts : array of strings representing the manifest path
                from root to this node (includes nodeKey)
     idSeed    : integer seed for deterministic node ids

   Output:
     { node, nextIdSeed }
============================================================ */

function manifestNodeToJsTreeNode(nodeKey, nodeValue, pathParts, idSeed) {

  if (!nodeKey) throw new Error("manifestNodeToJsTreeNode: nodeKey missing");
  if (!pathParts || !Array.isArray(pathParts)) {
    throw new Error("manifestNodeToJsTreeNode: pathParts missing/invalid");
  }

  const nodeId = "helpNode_" + idSeed;
  let nextIdSeed = idSeed + 1;

  // ARRAY LEAF
  if (Array.isArray(nodeValue)) {

    // Empty array => prune this node.
    if (nodeValue.length === 0) {
      return { node: null, nextIdSeed: nextIdSeed };
    }

    const children = [];

    for (let i = 0; i < nodeValue.length; i++) {
      const leafKey = nodeValue[i];

      const leafId = "helpNode_" + nextIdSeed;
      nextIdSeed++;

      const helpPath = computeHelpPathFromParts(pathParts, leafKey);

      children.push({
        id: leafId,
        text: leafKey,
        children: [],
        data: { helpPath: helpPath }
      });
    }

    return {
      node: {
        id: nodeId,
        text: nodeKey,
        children: children
      },
      nextIdSeed: nextIdSeed
    };
  }

  // OBJECT BRANCH
  if (nodeValue && typeof nodeValue === "object") {

    const children = [];

    for (const childKey in nodeValue) {

      const res = manifestNodeToJsTreeNode(
        childKey,
        nodeValue[childKey],
        pathParts.concat([childKey]),
        nextIdSeed
      );

      nextIdSeed = res.nextIdSeed;

      if (res.node !== null) {
        children.push(res.node);
      }
    }

    if (children.length === 0) {
      return { node: null, nextIdSeed: nextIdSeed };
    }

    return {
      node: {
        id: nodeId,
        text: nodeKey,
        children: children
      },
      nextIdSeed: nextIdSeed
    };
  }

  throw new Error("manifestNodeToJsTreeNode: invalid nodeValue type for key: " + nodeKey);

} // end manifestNodeToJsTreeNode


/* ============================================================
   computeHelpPathFromParts(pathParts, leafKey)
   ------------------------------------------------------------
   Builds the canonical help file path for a leaf.

   Rules:
     - Root index special case:
         pathParts[0] === "root" and leafKey === "index"
         => "/help/index.html"

     - Otherwise:
         "/help/<pathParts[0]>/<pathParts[1]>/<pathParts[2]>.../<leafKey>.html"

     - leafKey may include ".js" in the manifest (example: ellipseDemo.js)
       For help HTML naming, we drop the ".js" suffix ONLY.
============================================================ */

function computeHelpPathFromParts(pathParts, leafKey) {

  if (!pathParts || !Array.isArray(pathParts) || pathParts.length === 0) {
    throw new Error("computeHelpPathFromParts: pathParts missing/invalid");
  }

  if (!leafKey) throw new Error("computeHelpPathFromParts: leafKey missing");

  // Special: root/index is a top-level help page
  if (pathParts.length === 1 && pathParts[0] === "root" && leafKey === "index") {
    return "/help/index.html";
  }

  // General: leafKey is used EXACTLY as-is (including ".js" if present)
  // Help pages are stored as: /help/<pathParts...>/<leafKey>.html
  const parts = ["", "help"];

  for (let i = 0; i < pathParts.length; i++) {
    const seg = pathParts[i];
    if (!seg) throw new Error("computeHelpPathFromParts: empty path segment");
    parts.push(seg);
  }

  parts.push(String(leafKey) + ".html");

  return parts.join("/");

} // end computeHelpPathFromParts


/* ============================================================
   initHelpJsTree(treeHostEl, treeData, onSelect)
   ------------------------------------------------------------
   Initializes (or re-initializes) jsTree in the left pane.

   Contract:
     - Always destroys any existing jsTree instance first.
     - Wires select_node.jstree to onSelect(evt, data).
============================================================ */

function initHelpJsTree(treeHostEl, treeData) {

  if (!treeHostEl) throw new Error("initHelpJsTree: treeHostEl missing");
  if (!Array.isArray(treeData)) throw new Error("initHelpJsTree: treeData must be an array");

  const $host = window.$(treeHostEl);

  // Destroy any existing tree instance cleanly.
  const inst = $host.jstree(true);
  if (inst) {
    $host.off(".jstree");
    $host.jstree("destroy");
  }

  // Initialize jsTree
  $host.jstree({
    core: {
      data: treeData,
      multiple: false,
      themes: {
        dots: false,
        icons: true
      }
    }
  });

  // Normal selection behavior (folder toggle or leaf load)
  $host.on("select_node.jstree", function (evt, data) {
    onHelpTreeNodeSelected(evt, data);
  });

} // end initHelpJsTree






/* ============================================================
   onHelpTreeNodeSelected(evt, data)
   ------------------------------------------------------------
   jsTree selection handler.
   Loads the selected node's helpPath into the right pane.
============================================================ */

function onHelpTreeNodeSelected(evt, data) {

  if (!data) throw new Error("onHelpTreeNodeSelected: data missing");
  if (!data.node) throw new Error("onHelpTreeNodeSelected: data.node missing");
  if (!data.instance) throw new Error("onHelpTreeNodeSelected: data.instance missing");

  const node = data.node;
  const inst = data.instance;

  // Folder node: close other top-level branches, then toggle this one.
  if (node.children && node.children.length > 0) {

    // If this folder is a top-level branch, close other top-level branches.
    if (node.parent === "#") {
      const rootIds = inst.get_node("#").children;
      for (let i = 0; i < rootIds.length; i++) {
        const id = rootIds[i];
        if (id !== node.id) inst.close_node(id);
      }
    }

    // Toggle the clicked folder (open if closed, close if open).
    inst.toggle_node(node);
    return;
  }

  // Leaf node: must have a helpPath stored
  const helpPath = node.data && node.data.helpPath;
  if (!helpPath) return;

  console.log("Help Browser: loading helpPath =", helpPath);

  const targetEl = document.getElementById("helpViewer");
  if (!targetEl) throw new Error("onHelpTreeNodeSelected: #helpViewer missing");

  loadHelpHtmlIntoPane(helpPath, targetEl);

} // end onHelpTreeNodeSelected




/* ============================================================
   loadHelpHtmlIntoPane(helpPath, targetEl)
   ------------------------------------------------------------
   Loads an HTML file and injects the <body> inner HTML into
   the viewer pane.

   Fail-fast:
     - throws on missing args
     - throws if fetch is not ok
============================================================ */
async function loadHelpHtmlIntoPane(helpPath, targetEl) {

  if (!helpPath) throw new Error("loadHelpHtmlIntoPane: helpPath missing");
  if (!targetEl) throw new Error("loadHelpHtmlIntoPane: targetEl missing");

  const resp = await fetch(helpPath);
  if (!resp.ok) {
    throw new Error("loadHelpHtmlIntoPane: fetch failed: " + helpPath);
  }

  const htmlText = await resp.text();

  // Reuse existing helper in this file
  const bodyInner = extractBodyInnerHtml(htmlText);

  targetEl.innerHTML = bodyInner;

} // end loadHelpHtmlIntoPane

/* ============================================================
   setHelpBrowserDefaultPage()
   ------------------------------------------------------------
   Forces the right pane to show /help/index.html every time the
   Help Browser overlay opens.
============================================================ */
function setHelpBrowserDefaultPage() {

  const viewer = document.getElementById("helpViewer");
  if (!viewer) throw new Error("setHelpBrowserDefaultPage: #helpViewer missing");

  loadHelpHtmlIntoPane("/help/index.html", viewer);

} // end setHelpBrowserDefaultPage


/* ============================================================
   pruneEmptyHelpManifest(node)
   ------------------------------------------------------------
   Returns a NEW manifest tree with any empty branches removed.

   Rules:
     - Arrays:
         • keep only items that actually have help files
           (we treat ".js" leaf entries as NOT help pages)
         • if result is empty => return null (prune)
     - Objects:
         • recursively prune children
         • if object ends up empty => return null (prune)
     - Any other type => throw

   Special:
     - "root": ["index"] should remain (index is the entry point)
============================================================ */function pruneEmptyHelpManifest(node) {

  if (Array.isArray(node)) {

    // Keep ALL entries exactly as-is.
    // Empty array => prune this branch.
    return node.length ? node.slice() : null;
  }

  if (node && typeof node === "object") {

    const out = {};

    for (const key in node) {
      const pruned = pruneEmptyHelpManifest(node[key]);
      if (pruned !== null) out[key] = pruned;
    }

    // If nothing survived, prune this whole branch.
    const keys = Object.keys(out);
    return keys.length ? out : null;
  }

  throw new Error("pruneEmptyHelpManifest: invalid node type");
} // end pruneEmptyHelpManifest






