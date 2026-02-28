/* ui/manifest.js
   ------------------------------------------------------------
   ManifestManager Ã¢â‚¬â€ New Architecture (Generic Loader)
   ------------------------------------------------------------
   Responsibilities:
     Ã¢â‚¬Â¢ Given a basedir string (e.g. "patterns", "gallery/Ideabook"),
       load manifest data using fileLayer.path helpers.

     Ã¢â‚¬Â¢ If ../<basedir>/directoryRegistry.json exists:
         - Load it as an array of category names.
         - For each category, load:
             ../<basedir>/<category>/manifest.json
         - Return an array-of-arrays:
             [ itemsForCat0, itemsForCat1, ... ]

     Ã¢â‚¬Â¢ Else if ../<basedir>/manifest.json exists:
         - Load it as a flat array and return that array.

     Ã¢â‚¬Â¢ Else:
         - Return [].

     Ã¢â‚¬Â¢ All results are cached per basedir.

   This module knows NOTHING about:
     - tabs
     - gallery vs patterns vs utilities vs help
     - UI, categories.js, menuManager, etc.

   It is a pure data loader sitting above fileLayer and
   below all UI/tab logic.
------------------------------------------------------------ */

import { fileLayer } from "./fileLayer.js";
export class ManifestManager {

  constructor() {
    // Cache: basedir Ã¢â€ â€™ data (array or array-of-arrays)
    this.cache = {};

    // Optional: store directoryRegistry arrays per basedir
    this.registryCache = {};

    // Shaped cache: basedir → { categoryName: [entries] }
    // Computed lazily by getCategoryMap() and cleared with clearCache().
    this.shapedCache = {};
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
  async get(basedir) {
    console.time(`ManifestManager.get(${basedir})`);

    // 1) Check cache first
    if (Object.prototype.hasOwnProperty.call(this.cache, basedir)) {
      console.timeEnd(`ManifestManager.get(${basedir})`);
      console.log(`-> Cache HIT for '${basedir}'`);
      return this.cache[basedir];
    }

    console.log(`-> Cache MISS for '${basedir}' - loading from disk...`);

    // 2) Try directoryRegistry.json
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

    /* ------------------------------------------------------------
       JULES UPDATE: Special handling for drawRegistry discovery
       ------------------------------------------------------------ */
    if (basedir === "drawRegistry") {
        const drawData = await this._discoverDrawRegistryItems();
        this.cache[basedir] = drawData;
        return drawData;
    }

    // 3) No directoryRegistry Ã¢â€ â€™ try flat manifest.json
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

    // 4) Nothing exists Ã¢â€ â€™ empty
    console.timeEnd(`ManifestManager.get(${basedir})`);
    this.cache[basedir] = [];
    return [];
  } // end get


  /* ============================================================
      _discoverDrawRegistryItems() (Jules)
      ------------------------------------------------------------
      Internal helper to scan the drawRegistry folder for
      subdirectories and their associated template JSONs.
   ============================================================ */
  async _discoverDrawRegistryItems() {
    try {
        const items = await fileLayer.listDirectory("drawRegistry");
        return items.filter(it => it.isDirectory).map(dir => ({
            parentId: dir.name,
            path: `drawRegistry/${dir.name}/`,
            type: "directory"
        }));
    } catch (err) {
        console.warn("ManifestManager: Could not discover drawRegistry items", err);
        return [];
    }
  }


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
