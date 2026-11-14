/* ui/manifest.js
   ------------------------------------------------------------
   ManifestManager --  New Architecture (Generic Loader)
   ------------------------------------------------------------
   Lists from folders (2026-11-04): for the libraries in INDEXED the
   lists come from the Node service's listLibrary
   (node/libraryIndex.mjs), worked out from the files in the folders,
   with manifest.json kept only as notes. The steps below are the
   fallback when there is no service.

   Responsibilities:
     - Given a basedir string (e.g. "patterns", "gallery/Ideabook"),
       load manifest data using fileLayer.path helpers.

     - If ../<basedir>/directoryRegistry.json exists:
         - Load it as an array of category names.
         - For each category, load:
             ../<basedir>/<category>/manifest.json
         - Return an array-of-arrays:
             [ itemsForCat0, itemsForCat1, ... ]

     - Else if ../<basedir>/manifest.json exists:
         - Load it as a flat array and return that array.

     - Else:
         - Return [].

     - All results are cached per basedir.

   This module knows NOTHING about:
     - tabs
     - gallery vs patterns vs utilities vs help
     - UI, categories.js, menuManager, etc.

   It is a pure data loader sitting above fileLayer and
   below all UI/tab logic.
------------------------------------------------------------ */

import { fileLayer } from "./fileLayer.js";
import { nodeDispatch } from "./nodeLayer.js";

// Libraries whose lists the Node service works out from the folders
// (node/libraryIndex.mjs, request listLibrary). Their manifest.json files
// are now only notes (titles, statuses, order); a file appears whether or
// not it has an entry. Without the service (a read-only copy) the lists
// are read from the manifest files as before.
const INDEXED = new Set(["patterns", "gallery/Scripts", "gallery/Ideabook", "gallery/Patterns",
                         "utilities/Lab", "utilities/Tools", "figures", "drawRegistry"]);
import { timed }     from "/ui/instrument.js";
export class ManifestManager {

  constructor() {
    // Cache: basedir --  data (array or array-of-arrays)
    this.cache = {};

    // Optional: store directoryRegistry arrays per basedir
    this.registryCache = {};

    // Shaped cache: basedir → { categoryName: [entries] }
    // Computed lazily by getCategoryMap() and cleared with clearCache().
    this.shapedCache = {};

    // Listener registry: basedir → [ callback, ... ]
    this.listeners = {};
  } // end constructor


  /* ============================================================
      get(basedir)
      ------------------------------------------------------------
      Public entry point.

      basedir examples:
        "patterns"
        "gallery/Ideabook"
        "gallery/Patterns"
        "gallery/Scripts"
        "utilities/Lab"
        "utilities/Tools"
        "help"

      Returns:
        - If directoryRegistry.json exists:
            [ [itemA, itemB, ...], [itemC, ...], ... ]
        - Else if manifest.json exists:
            [ item1, item2, ... ]
        - Else:
            []

      ALWAYS returns an array.
   ============================================================ */
  get(basedir) {
    return timed("manifest " + basedir, () => this.loadOrCache(basedir));
  } // end get


  // The work of get(): the cache check, then reading from disk.
  async loadOrCache(basedir) {
    console.time(`ManifestManager.get(${basedir})`);

    // 1) Check cache first
    if (Object.prototype.hasOwnProperty.call(this.cache, basedir)) {
      console.timeEnd(`ManifestManager.get(${basedir})`);
      console.log(`-> Cache HIT for '${basedir}'`);
      return this.cache[basedir];
    }

    console.log(`-> Cache MISS for '${basedir}' - loading from disk...`);

    // 2) A library the service lists from its folders.
    if (INDEXED.has(basedir)) {
      try {
        const r = await nodeDispatch("listLibrary", { basedir });
        if (!Array.isArray(r.items) || !Array.isArray(r.categories)) throw new Error("listLibrary: no lists in the answer");
        this.cache[basedir] = r.items;
        this.registryCache[basedir] = r.categories;
        return r.items;
      } catch (err) {
        console.warn("ManifestManager: no listLibrary for '" + basedir + "', reading manifest files", err);
      }
    }

    // 3) Try directoryRegistry.json
    const dirRegPath = fileLayer.path.directoryRegistry(basedir);
    const hasDirReg  = await fileLayer.exists(dirRegPath);

    if (hasDirReg) {
      const registry = await fileLayer.loadJSON(dirRegPath);

      if (!Array.isArray(registry)) {
        throw new Error(
          `ManifestManager.get: directoryRegistry at '${dirRegPath}' must be an array`
        );
      }

      const groups = [];

      for (const category of registry) {
        const manifestPath = fileLayer.path.categoryManifest(basedir, category);
        const exists = await fileLayer.exists(manifestPath);

        let items = [];
        if (exists) {
          const data = await fileLayer.loadJSON(manifestPath);
          if (!Array.isArray(data)) {
            throw new Error(
              `ManifestManager.get: manifest at '${manifestPath}' must be an array`
            );
          }
          items = data;
        }

        groups.push(items);
      }

      this.cache[basedir] = groups;
      this.registryCache[basedir] = registry;
      return groups;
    }

    // 3) No directoryRegistry --  try flat manifest.json
    const flatPath   = fileLayer.path.flatManifest(basedir);
    const hasFlat    = await fileLayer.exists(flatPath);

    if (hasFlat) {
      const data = await fileLayer.loadJSON(flatPath);

      if (!Array.isArray(data)) {
        throw new Error(
          `ManifestManager.get: manifest at '${flatPath}' must be an array`
        );
      }

      this.cache[basedir] = data;
      return data;
    }

    // 4) Nothing exists --  empty
    console.timeEnd(`ManifestManager.get(${basedir})`);
    this.cache[basedir] = [];
    return [];
  } // end get


  /* ============================================================
      getRegistry(basedir)
      ------------------------------------------------------------
      Optional helper: return directoryRegistry array (if any)
      previously read when get(basedir) was called.

      If no directoryRegistry exists for that basedir, or if
      get(basedir) hasn't been called yet, returns [].
   ============================================================ */
  getRegistry(basedir) {
    const reg = this.registryCache[basedir];
    return Array.isArray(reg) ? reg : [];
  } // end getRegistry




  /* ============================================================
      getCategoryMap(basedir)
      ------------------------------------------------------------
      Returns the manifest data for a basedir shaped as a plain
      object: { categoryName: [entries], ... }

      This is the single authoritative source tabs should use
      instead of maintaining their own local caches.

      Requires that get(basedir) has already been awaited so the
      raw data and registry are warm. Will throw if called before
      the basedir has been loaded.

      Result is memoized in this.shapedCache and cleared by
      clearCache(), so invalidation is automatic.
   ============================================================ */
  getCategoryMap(basedir) {

    // Return memoized shaped result if available.
    if (Object.prototype.hasOwnProperty.call(this.shapedCache, basedir)) {
      return this.shapedCache[basedir];
    }

    const raw      = this.cache[basedir];
    const registry = this.registryCache[basedir];

    if (!raw || !registry) {
      throw new Error(
        `ManifestManager.getCategoryMap: '${basedir}' not yet loaded. ` +
        `Call await manifest.get('${basedir}') first.`
      );
    }

    const map = {};
    for (let i = 0; i < registry.length; i++) {
      map[registry[i]] = raw[i] || [];
    }

    this.shapedCache[basedir] = map;
    return map;

  } // end getCategoryMap

  /* ============================================================
      register(key, callback)
      ------------------------------------------------------------
      Register a callback to be fired when invalidate(key) is
      called. Multiple tabs may register for the same key.

      key      — basedir string, e.g. "patterns", "figures"
      callback — zero-argument function that refreshes the tab
   ============================================================ */
  register(key, callback) {
    if (!this.listeners[key]) this.listeners[key] = [];
    this.listeners[key].push(callback);
  } // end register


  /* ============================================================
      invalidate(key)
      ------------------------------------------------------------
      Clear cache entries for the given key, then fire all
      registered callbacks for that key.

      Replaces the scattered pattern of:
        manifest.clearCache();
        <manual tab refresh call>
   ============================================================ */
  invalidate(key) {
    delete this.cache[key];
    delete this.registryCache[key];
    delete this.shapedCache[key];

    console.log(`ManifestManager: invalidated '${key}'`);

    const callbacks = this.listeners[key] || [];
    callbacks.forEach(cb => cb());
  } // end invalidate


  /* ============================================================
      clearCache()
      ------------------------------------------------------------
      Utility: clear all cached manifest data and directory
      registries. A tab or system utility could call this if it
      knows manifests have changed on disk.
   ============================================================ */
  clearCache() {
    this.cache = {};
    this.registryCache = {};
    this.shapedCache = {};

    // Optional: Log to console so you know the "Global Reset" happened
    console.log("ManifestManager: Global cache cleared.");
  } // end clearCache

} // end class ManifestManager


// Singleton instance (matches previous pattern)
export const manifest = new ManifestManager();
