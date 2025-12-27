/* ui/manifest.js
   ------------------------------------------------------------
   ManifestManager — New Architecture (Generic Loader)
   ------------------------------------------------------------
   Responsibilities:
     • Given a basedir string (e.g. "patterns", "gallery/Ideabook"),
       load manifest data using fileLayer.path helpers.

     • If ../<basedir>/directoryRegistry.json exists:
         - Load it as an array of category names.
         - For each category, load:
             ../<basedir>/<category>/manifest.json
         - Return an array-of-arrays:
             [ itemsForCat0, itemsForCat1, ... ]

     • Else if ../<basedir>/manifest.json exists:
         - Load it as a flat array and return that array.

     • Else:
         - Return [].

     • All results are cached per basedir.

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
    // Cache: basedir → data (array or array-of-arrays)
    this.cache = {};

    // Optional: store directoryRegistry arrays per basedir
    this.registryCache = {};
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
    // 1) Check cache first
    if (Object.prototype.hasOwnProperty.call(this.cache, basedir)) {
      return this.cache[basedir];
    }

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

    // 3) No directoryRegistry → try flat manifest.json
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

    // 4) Nothing exists → empty
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
    if (!reg) return [];
    if (!Array.isArray(reg)) return [];
    return reg;
  } // end getRegistry


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
  } // end clearCache

} // end class ManifestManager


// Singleton instance (matches previous pattern)
export const manifest = new ManifestManager();
