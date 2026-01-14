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
  //
  // NOTE:
  //   - Paths MUST be absolute ("/..."), not "../..."
  //   - Uses GET (HEAD is unreliable under Vite)
  // ----------------------------------------------------------
  async exists(path) {
    try {
      if (!path) throw new Error("fileLayer.exists: path missing");

      let p = String(path).trim();
      if (!p) throw new Error("fileLayer.exists: path empty");

      // Enforce absolute paths only
      if (!p.startsWith("/")) {
        throw new Error("fileLayer.exists: relative path not allowed: " + p);
      }

      const resp = await fetch(p, { method: "GET", cache: "no-store" });
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

    const resp = await fetch(path, { cache: "no-store" });

    if (!resp.ok) {
      return null;
    }

    const txt = await resp.text();
    return JSON.parse(txt);

  } catch (err) {
    console.error("fileLayer.loadJSON ERROR:", path, err);
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
     PATH HELPERS (PREFERRED API)
     ----------------------------------------------------------
     ALL helpers return absolute paths.
     NO "../" is ever produced.
  ========================================================== */
  path: {

    // /<basedir>/directoryRegistry.json
    directoryRegistry(basedir) {
      return `/${basedir}/directoryRegistry.json`;
    }, // end directoryRegistry

    // /<basedir>/<category>/manifest.json
    categoryManifest(basedir, category) {
      return `/${basedir}/${category}/manifest.json`;
    }, // end categoryManifest

    // /<basedir>/manifest.json
    flatManifest(basedir) {
      return `/${basedir}/manifest.json`;
    }, // end flatManifest

    // /help/<tabName>/<itemName>.html
    helpHtml(tabName, itemName) {
      return `/help/${tabName}/${itemName}.html`;
    }, // end helpHtml

    // Generic script path: /<tabName>/<itemName>.js
    script(tabName, itemName) {
      const clean = itemName.replace(/\.js$/i, "");
      return `/${tabName}/${clean}.js`;
    }, // end script

    // /patterns/<category>/<file>.js
    patternScript(category, file) {
      const clean = file.replace(/\.js$/i, "");
      return `/patterns/${category}/${clean}.js`;
    }, // end patternScript

    // /gallery/Scripts/<file>.js
    galleryScript(file) {
      const clean = file.replace(/\.js$/i, "");
      return `/gallery/Scripts/${clean}.js`;
    }, // end galleryScript

    // /utilities/<category>/<file>.js
    utilityScript(category, file) {
      const clean = file.replace(/\.js$/i, "");
      return `/utilities/${category}/${clean}.js`;
    } // end utilityScript

  }, // end path


  /* ==========================================================
     LEGACY NORMALIZERS
     ----------------------------------------------------------
     Kept for backward compatibility.
     These now delegate to absolute path helpers.
  ========================================================== */

  normalizeHelpPath(tabName, itemName) {
    return this.path.helpHtml(tabName, itemName);
  }, // end normalizeHelpPath

  normalizeScriptPath(tabName, itemName) {
    return this.path.script(tabName, itemName);
  }, // end normalizeScriptPath

  normalizePatternPath(category, file) {
    return this.path.patternScript(category, file);
  }, // end normalizePatternPath

  normalizeGalleryScript(file) {
    return this.path.galleryScript(file);
  }, // end normalizeGalleryScript

  normalizeUtilityPath(category, file) {
    return this.path.utilityScript(category, file);
  } // end normalizeUtilityPath

}; // end fileLayer
