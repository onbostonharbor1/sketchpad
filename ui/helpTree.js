/* ===========================================================
   helpTree.js
   -----------------------------------------------------------
   The Help browser tree (jsTree) and the pane that shows the selected page. Makes jQuery available
   as window.$ for the existing code.
   =========================================================== */

import $ from "jquery";
import "jstree";
import "jstree/dist/themes/default/style.css";

/* Make jQuery available globally (so existing code can use window.$) */
window.$ = $;
window.jQuery = $;

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
   destroyHelpJsTree()
   ------------------------------------------------------------
   Destroys any existing jsTree instance and unhooks events.

   This prevents duplicate initialization when Help is opened
   repeatedly.
============================================================ */
export function destroyHelpJsTree() {

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
export function buildHelpJsTreeData(helpManifest) {

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

export function initHelpJsTree(treeHostEl, treeData) {

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

export function onHelpTreeNodeSelected(evt, data) {

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
export function setHelpBrowserDefaultPage() {

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
