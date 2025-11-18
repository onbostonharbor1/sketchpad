/* manifests.js
   ============================================================
   ManifestManager — Unified, Fully Commented Version
   ============================================================

   Purpose:
     Central manager for ALL manifest.json and
     directoryRegistry.json files across Sketchpad.

   Tabs served:
     • Patterns
     • Gallery (Ideabook, Patterns, Scripts)
     • Utilities (Tools, Lab, Result)
     • Draw (Phase 3 — registry)

   Why this file exists:
     - Eliminates duplicated fetch logic from patterns.js,
       gallery.js, utilities.js.
     - Caches results in memory.
     - Provides a single fail-fast, predictable API.
     - Will support write-back (PUT) for pattern saving.

   You have ONE class.
   Defined ONCE.
   Exported ONCE.
   Everything below belongs to that class.

   ============================================================
*/

export class ManifestManager {
  /* ==========================================================
     Constructor
     ----------------------------------------------------------
     Initializes the master manifest cache and bookkeeping.
     No side effects, no I/O.
     ========================================================== */
  constructor() {
    // ---------------------------
    // In-memory manifest cache
    // ---------------------------
    this.cache = {
      patterns: {}, // category → entries[]
      gallery: {
        ideabook: {}, // category → entries[]
        patterns: {}, // category → entries[]
        scripts: [], // simple array
      },
      utilities: {
        tools: {}, // category → entries[]
        lab: {}, // category → entries[]
        result: {}, // reserved, empty
      },
      draw: {}, // Phase 3: registry objects
    };

    // directoryRegistry.json results
    this.directoryRegistry = {};

    // optional timestamps (unused)
    this.timestamp = {};
  } // end constructor

  /* ==========================================================
     PART 1 — PRIVATE JSON LOADERS
     ========================================================== */

  // ----------------------------------------------------------
  // #loadJSON(path)
  // ----------------------------------------------------------
  /*
     PRIVATE — loads JSON and returns parsed data.

     Arguments:
       path (string) — URL of JSON file

     Returns:
       object | array | null

     Behavior:
       - Logs errors but does not throw.
       - Mirrors original loadJSON().
  */
  async #loadJSON(path) {
    try {
      const resp = await fetch(path);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${path}`);
      return await resp.json();
    } catch (err) {
      console.error(`Error loading JSON from ${path}:`, err);
      return null;
    }
  } // end #loadJSON

  // ----------------------------------------------------------
  // #loadDirectoryRegistry(basePath)
  // ----------------------------------------------------------
  /*
     Loads:
       <basePath>/directoryRegistry.json

     Example:
       basePath = "./patterns"
       → loads "./patterns/directoryRegistry.json"

     Returns:
       array of folder names or null
  */
  async #loadDirectoryRegistry(basePath) {
    return await this.#loadJSON(`${basePath}/directoryRegistry.json`);
  } // end #loadDirectoryRegistry

  // ----------------------------------------------------------
  // #loadManifest(basePath, category)
  // ----------------------------------------------------------
  /*
     Loads:
       <basePath>/<category>/manifest.json

     Example:
       "./patterns/Star/manifest.json"

     Returns array or null.
  */
  async #loadManifest(basePath, category) {
    return await this.#loadJSON(`${basePath}/${category}/manifest.json`);
  } // end #loadManifest

  // ----------------------------------------------------------
  // #loadManifestGroup(basePath)
  // ----------------------------------------------------------
  /*
     Loads directoryRegistry.json and all category manifests
     inside a subfolder (e.g., gallery Ideabook).

     Example:
       basePath = "./gallery/Ideabook"

     Returns object:
       { category1: [...], category2: [...], ... }
  */
  async #loadManifestGroup(basePath) {
    try {
      const dirs = await this.#loadDirectoryRegistry(basePath);
      if (!dirs) throw new Error("Missing directoryRegistry.json");

      const results = {};
      for (const cat of dirs) {
        const items = await this.#loadManifest(basePath, cat);
        results[cat] = items || [];
      }
      return results;
    } catch (err) {
      console.error(`Failed to load manifest group ${basePath}:`, err);
      return {};
    }
  } // end #loadManifestGroup

  /* ==========================================================
     PART 2 — PUBLIC API + TAB ADAPTERS
     ========================================================== */

  // ----------------------------------------------------------
  // load(tabName)
  // ----------------------------------------------------------
  /*
     Loads all manifests for a given top-level tab.
     Fills the in-memory cache.

     Arguments:
       tabName = "patterns" | "gallery" | "utilities" | "draw"

     Returns:
       cached object (patterns/gallery/utilities/draw)
  */
  async load(tabName) {
    switch (tabName) {
      case "patterns":
        return await this.#loadPatterns();

      case "gallery":
        return await this.#loadGallery();

      case "utilities":
        return await this.#loadUtilities();

      case "draw":
        return this.cache.draw;

      default:
        throw new Error(`Manifest.load: unknown tab '${tabName}'`);
    }
  } // end load

  // ----------------------------------------------------------
  // #loadPatterns()
  // ----------------------------------------------------------
  /*
     Loads:
       ./patterns/directoryRegistry.json
       ./patterns/<category>/manifest.json

     Caches:
       this.cache.patterns
  */
  async #loadPatterns() {
    const base = "./patterns";

    const dirs = await this.#loadDirectoryRegistry(base);
    if (!Array.isArray(dirs)) return this.cache.patterns;

    const out = {};
    for (const cat of dirs) {
      const items = await this.#loadManifest(base, cat);
      out[cat] = items || [];
    }

    this.cache.patterns = out;
    this.directoryRegistry.patterns = dirs;
    return out;
  } // end #loadPatterns

  // ----------------------------------------------------------
  // #loadGallery()
  // ----------------------------------------------------------
  /*
     Loads:
       ./gallery/Ideabook/*
       ./gallery/Patterns/*
       ./gallery/Scripts/manifest.json

     Result cached at:
       this.cache.gallery
  */
  async #loadGallery() {
    const base = "./gallery";

    const ideabook = await this.#loadManifestGroup(`${base}/Ideabook`);
    const patterns = await this.#loadManifestGroup(`${base}/Patterns`);

    let scripts = await this.#loadManifest(base, "Scripts");
    if (!Array.isArray(scripts)) scripts = [];

    this.cache.gallery = { ideabook, patterns, scripts };
    return this.cache.gallery;
  } // end #loadGallery

  // ----------------------------------------------------------
  // #loadUtilities()
  // ----------------------------------------------------------
  /*
     Loads:
       ./utilities/Tools/*
       ./utilities/Lab/*

     Result cached at:
       this.cache.utilities
  */
  async #loadUtilities() {
    const base = "./utilities";

    const toolsDirs = await this.#loadDirectoryRegistry(`${base}/Tools`);
    const labDirs = await this.#loadDirectoryRegistry(`${base}/Lab`);

    const tools = {};
    const lab = {};

    if (Array.isArray(toolsDirs)) {
      for (const d of toolsDirs) {
        const items = await this.#loadManifest(`${base}/Tools`, d);
        tools[d] = items || [];
      }
    }

    if (Array.isArray(labDirs)) {
      for (const d of labDirs) {
        const items = await this.#loadManifest(`${base}/Lab`, d);
        lab[d] = items || [];
      }
    }

    this.cache.utilities = { tools, lab, result: {} };
    this.directoryRegistry.utilities = {
      tools: toolsDirs || [],
      lab: labDirs || [],
    };

    return this.cache.utilities;
  } // end #loadUtilities

  // ----------------------------------------------------------
  // getCategories(tabName)
  // ----------------------------------------------------------
  /*
     Returns the appropriate list of category names.
  */
  getCategories(tabName) {
    const cache = this.cache[tabName];
    if (!cache) return [];

    if (tabName === "patterns")
      return Object.keys(cache).sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
      );

    if (tabName === "gallery") return ["Ideabook", "Patterns", "Scripts"];

    if (tabName === "utilities") return ["Tools", "Lab", "Result"];

    if (tabName === "draw") return Object.keys(cache);

    return [];
  } // end getCategories

  // ----------------------------------------------------------
  // getItems(tabName, category)
  // ----------------------------------------------------------
  /*
     Returns item arrays/objects depending on the tab.
  */
  getItems(tabName, category) {
    if (tabName === "patterns") return this.cache.patterns?.[category] || [];

    if (tabName === "gallery") {
      if (category === "Scripts") return this.cache.gallery.scripts;
      if (category === "Ideabook") return this.cache.gallery.ideabook;
      if (category === "Patterns") return this.cache.gallery.patterns;
      return [];
    }

    if (tabName === "utilities") {
      if (category === "Tools") return this.cache.utilities.tools;
      if (category === "Lab") return this.cache.utilities.lab;
      if (category === "Result") return this.cache.utilities.result;
      return [];
    }

    if (tabName === "draw") return this.cache.draw[category] || [];

    return [];
  } // end getItems

  /*
     resolvePath(tabName, category, filename)
     ----------------------------------------------------------
     IMPORTANT NOTE:
       Because manifest.js lives in the /ui/ directory, all
       resolved paths MUST climb OUT of /ui/ using "../".

       Example:
         /ui/manifest.js
         /patterns/circles/ellipseEndTaper.js

       Therefore the correct relative path from manifest.js is:
         "../patterns/circles/ellipseEndTaper.js"

       NOT:
         "./patterns/..."   ← (this incorrectly expands to /ui/patterns)
  */
  resolvePath(tabName, category, filename) {
    if (!filename) return "";

    // Remove .js extension if included
    filename = filename.replace(/\.js$/i, "");

    // -------------------------------
    // PATTERNS TAB
    // -------------------------------
    if (tabName === "patterns") {
      /*
         patterns/<category>/<filename>.js
         must be addressed relative to /ui/
         → "../patterns/<category>/<filename>.js"
      */
      return `../patterns/${category}/${filename}.js`;
    }

    // -------------------------------
    // GALLERY TAB
    // -------------------------------
    if (tabName === "gallery") {
      // Scripts live in a single folder
      if (category === "Scripts") {
        return `../gallery/Scripts/${filename}.js`;
      }

      // Ideabook / Patterns items have image or js paths
      return `../gallery/${category}/${filename}`;
    }

    // -------------------------------
    // UTILITIES TAB
    // -------------------------------
    if (tabName === "utilities") {
      /*
         utilities/<folder>/<filename>.js
         → "../utilities/<folder>/<filename>.js"
      */
      return `../utilities/${category}/${filename}.js`;
    }

    // -------------------------------
    // DRAW TAB (Phase 3)
    // -------------------------------
    if (tabName === "draw") {
      /*
         Draw registry objects have no file paths — resolved
         in registry entries instead.
      */
      return "";
    }

    console.warn("Manifest.resolvePath: unknown tab", tabName);
    return "";
  } // end resolvePath

  /* ==========================================================
     PART 3 — MUTATION + WRITE BACK
     ========================================================== */

  // ----------------------------------------------------------
  // addManifestEntry(tabName, category, entry)
  // ----------------------------------------------------------
  addManifestEntry(tabName, category, entry) {
    if (!entry || typeof entry !== "object")
      throw new Error("addManifestEntry: entry must be object");

    const list = this.#grabManifestList(tabName, category);
    list.push(entry);
    return entry;
  } // end addManifestEntry

  // ----------------------------------------------------------
  // removeManifestEntry(tabName, category, filename)
  // ----------------------------------------------------------
  removeManifestEntry(tabName, category, filename) {
    if (!filename) throw new Error("removeManifestEntry: filename required");

    const list = this.#grabManifestList(tabName, category);
    const idx = list.findIndex((e) => e.filename === filename);

    if (idx < 0)
      throw new Error(`removeManifestEntry: '${filename}' not found`);

    list.splice(idx, 1);
  } // end removeManifestEntry

  // ----------------------------------------------------------
  // updateManifestEntry(tabName, category, filename, newData)
  // ----------------------------------------------------------
  updateManifestEntry(tabName, category, filename, newData) {
    if (!filename) throw new Error("updateManifestEntry: filename required");

    if (!newData || typeof newData !== "object")
      throw new Error("updateManifestEntry: newData must be object");

    const list = this.#grabManifestList(tabName, category);
    const idx = list.findIndex((e) => e.filename === filename);

    if (idx < 0)
      throw new Error(`updateManifestEntry: '${filename}' not found`);

    list[idx] = { ...list[idx], ...newData };
    return list[idx];
  } // end updateManifestEntry

  // ----------------------------------------------------------
  // writeManifest(tabName, category)
  // ----------------------------------------------------------
  async writeManifest(tabName, category) {
    const { base, folder } = this.#resolveManifestFolder(tabName, category);
    const list = this.#grabManifestList(tabName, category);

    const path = `${base}/${folder}/manifest.json`;

    const resp = await fetch(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(list, null, 2),
    });

    if (!resp.ok) throw new Error(`writeManifest failed: HTTP ${resp.status}`);

    return true;
  } // end writeManifest

  // ----------------------------------------------------------
  // scanFolderForFiles(tabName, category)
  // ----------------------------------------------------------
  async scanFolderForFiles(tabName, category) {
    const { base, folder } = this.#resolveManifestFolder(tabName, category);
    const full = `${base}/${folder}`;

    try {
      const resp = await fetch(full);
      if (!resp.ok) throw new Error(`scanFolderForFiles HTTP ${resp.status}`);

      const text = await resp.text();
      const matches = [...text.matchAll(/href="([^"]+\.js)"/gi)];

      return matches.map((m) => m[1].replace(/\.js$/i, ""));
    } catch (err) {
      console.error(`scanFolderForFiles error for ${full}:`, err);
      return [];
    }
  } // end scanFolderForFiles

  /* ==========================================================
     PRIVATE HELPERS
     ========================================================== */

  // ----------------------------------------------------------
  // #grabManifestList(tabName, category)
  // ----------------------------------------------------------
  #grabManifestList(tabName, category) {
    switch (tabName) {
      case "patterns":
        if (!this.cache.patterns[category]) this.cache.patterns[category] = [];
        return this.cache.patterns[category];

      case "gallery":
        if (category === "Scripts") return this.cache.gallery.scripts;

        if (this.cache.gallery.ideabook[category])
          return this.cache.gallery.ideabook[category];

        if (this.cache.gallery.patterns[category])
          return this.cache.gallery.patterns[category];

        throw new Error(`Unknown gallery category '${category}'`);

      case "utilities":
        if (this.cache.utilities.tools[category])
          return this.cache.utilities.tools[category];

        if (this.cache.utilities.lab[category])
          return this.cache.utilities.lab[category];

        if (this.cache.utilities.result[category])
          return this.cache.utilities.result[category];

        throw new Error(`Unknown utilities category '${category}'`);

      default:
        throw new Error(`grabManifestList: unsupported tab '${tabName}'`);
    }
  } // end #grabManifestList

  // ----------------------------------------------------------
  // #resolveManifestFolder(tabName, category)
  // ----------------------------------------------------------
  #resolveManifestFolder(tabName, category) {
    switch (tabName) {
      case "patterns":
        return { base: "./patterns", folder: category };

      case "gallery":
        if (category === "Ideabook")
          return { base: "./gallery", folder: "Ideabook" };
        if (category === "Patterns")
          return { base: "./gallery", folder: "Patterns" };
        if (category === "Scripts")
          return { base: "./gallery", folder: "Scripts" };
        throw new Error(`Unknown gallery category '${category}'`);

      case "utilities":
        if (category === "Tools")
          return { base: "./utilities", folder: "Tools" };
        if (category === "Lab") return { base: "./utilities", folder: "Lab" };
        if (category === "Result")
          return { base: "./utilities", folder: "Result" };
        throw new Error(`Unknown utilities category '${category}'`);

      default:
        throw new Error(`resolveManifestFolder: unsupported tab '${tabName}'`);
    }
  } // end #resolveManifestFolder
} // end class ManifestManager

/* ==========================================================
   FINAL EXPORT — SINGLETON INSTANCE
   ========================================================== */
/*
   All tabs import this:

       import { manifest } from "./manifest.js";

   Only ONE instance exists across the system.
*/
export const manifest = new ManifestManager();
