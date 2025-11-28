/* ui/fileLayer.js
   ------------------------------------------------------------
   Unified file/URL/path abstraction for ALL tabs.
   Absolutely no UI logic, no manifest logic.
   Pure low-level ops.
   ------------------------------------------------------------ */

export const fileLayer = {

  // ----------------------------------------------------------
  // exists(path)
  // Returns true/false based on HTTP 200
  // ----------------------------------------------------------
  async exists(path) {
    try {
      const resp = await fetch(path, { method: "HEAD" });
      return resp.ok;
    } catch (err) {
      console.error("fileLayer.exists error:", path, err);
      return false;
    }
  }, // end exists


  // ----------------------------------------------------------
  // loadText(path)
  // Returns text, or null on error
  // ----------------------------------------------------------
  async loadText(path) {
    try {
      const resp = await fetch(path);
      if (!resp.ok) return null;
      return await resp.text();
    } catch (err) {
      console.error("fileLayer.loadText:", path, err);
      return null;
    }
  }, // end loadText


  // ----------------------------------------------------------
  // loadJSON(path)
  // Returns parsed JSON, or null
  // ----------------------------------------------------------
  async loadJSON(path) {
    try {
      const resp = await fetch(path);
      if (!resp.ok) return null;
      return await resp.json();
    } catch (err) {
      console.error("fileLayer.loadJSON:", path, err);
      return null;
    }
  }, // end loadJSON


  // ----------------------------------------------------------
  // listDirectory(path)
  // Browser hack: parse HTML directory listings
  // Returns filenames[]
  // ----------------------------------------------------------
  async listDirectory(path) {
    try {
      const txt = await this.loadText(path);
      if (!txt) return [];

      const matches = [...txt.matchAll(/href="([^"]+)"/gi)];
      return matches.map((m) => m[1]);
    } catch (err) {
      console.error("fileLayer.listDirectory:", path, err);
      return [];
    }
  }, // end listDirectory


/* ----------------------------------------------------------
   helpExists(tabName, itemName)
   /help/<tabName>/<itemName>.html
---------------------------------------------------------- */
helpExists(tabName, itemName) {
  const path = `/help/${tabName}/${itemName}.html`;
  return this.exists(path);
}, // end helpExists


  /* ==========================================================
     PATH HELPERS (NEW, PREFERRED API)
     ----------------------------------------------------------
     All higher-level modules (manifest, tabs, help, scripts)
     should use these helpers to construct paths.

     NOTE:
       - manifest.js will use:
           path.directoryRegistry(basedir)
           path.categoryManifest(basedir, category)
           path.flatManifest(basedir)
       - help/menu code will use:
           path.helpHtml(tabName, itemName)
       - script loaders may use:
           path.patternScript(category, file)
           path.galleryScript(file)
           path.utilityScript(category, file)
  ========================================================== */
  path: {

    // ../<basedir>/directoryRegistry.json
    directoryRegistry(basedir) {
      return `../${basedir}/directoryRegistry.json`;
    }, // end directoryRegistry

    // ../<basedir>/<category>/manifest.json
    categoryManifest(basedir, category) {
      return `../${basedir}/${category}/manifest.json`;
    }, // end categoryManifest

    // ../<basedir>/manifest.json
    flatManifest(basedir) {
      return `../${basedir}/manifest.json`;
    }, // end flatManifest

    // /help/<tabName>/<itemName>.html
    helpHtml(tabName, itemName) {
      return `/help/${tabName}/${itemName}.html`;
    }, // end helpHtml

    // Generic script path: ../<tabName>/<itemName>.js
    script(tabName, itemName) {
      const clean = itemName.replace(/\.js$/i, "");
      return `../${tabName}/${clean}.js`;
    }, // end script

    // ../patterns/<category>/<file>.js
    patternScript(category, file) {
      const clean = file.replace(/\.js$/i, "");
      return `../patterns/${category}/${clean}.js`;
    }, // end patternScript

    // ../gallery/Scripts/<file>.js
    galleryScript(file) {
      const clean = file.replace(/\.js$/i, "");
      return `../gallery/Scripts/${clean}.js`;
    }, // end galleryScript

    // ../utilities/<category>/<file>.js
    utilityScript(category, file) {
      const clean = file.replace(/\.js$/i, "");
      return `../utilities/${category}/${clean}.js`;
    } // end utilityScript

  }, // end path



  /* ==========================================================
     LEGACY NORMALIZERS
     ----------------------------------------------------------
     These are kept for backward compatibility. New code should
     prefer fileLayer.path.* helpers instead.
  ========================================================== */

  // ----------------------------------------------------------
  // normalizeHelpPath(tabName, itemName)
  // ----------------------------------------------------------
  normalizeHelpPath(tabName, itemName) {
    return this.path.helpHtml(tabName, itemName);
  }, // end normalizeHelpPath


  // ----------------------------------------------------------
  // normalizeScriptPath(tabName, itemName)
  // ----------------------------------------------------------
  normalizeScriptPath(tabName, itemName) {
    return this.path.script(tabName, itemName);
  }, // end normalizeScriptPath


  // ----------------------------------------------------------
  // normalizePatternPath(category, file)
  // ../patterns/<category>/<file>.js
  // ----------------------------------------------------------
  normalizePatternPath(category, file) {
    return this.path.patternScript(category, file);
  }, // end normalizePatternPath


  // ----------------------------------------------------------
  // normalizeGalleryScript(file)
  // ../gallery/Scripts/<file>.js
  // ----------------------------------------------------------
  normalizeGalleryScript(file) {
    return this.path.galleryScript(file);
  }, // end normalizeGalleryScript


  // ----------------------------------------------------------
  // normalizeUtilityPath(category, file)
  // ../utilities/<category>/<file>.js
  // ----------------------------------------------------------
  normalizeUtilityPath(category, file) {
    return this.path.utilityScript(category, file);
  } // end normalizeUtilityPath

}; // end fileLayer
