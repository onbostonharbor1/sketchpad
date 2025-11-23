/* ui/fileLayer.js
   ------------------------------------------------------------
   Unified file/URL/path abstraction for ALL tabs.
   Absolutely no UI logic, no manifest logic.
   Pure low-level ops.
   ------------------------------------------------------------
*/

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
      return matches.map(m => m[1]);
    } catch (err) {
      console.error("fileLayer.listDirectory:", path, err);
      return [];
    }
  }, // end listDirectory


  // ----------------------------------------------------------
  // normalizeHelpPath(tabName, itemName)
  // ----------------------------------------------------------
  normalizeHelpPath(tabName, itemName) {
    return `./help/${tabName}/${itemName}.html`;
  }, // end normalizeHelpPath


  // ----------------------------------------------------------
  // normalizeScriptPath(tabName, itemName)
  // ----------------------------------------------------------
  normalizeScriptPath(tabName, itemName) {
    return `../${tabName}/${itemName}.js`;
  }, // end normalizeScriptPath


  // ----------------------------------------------------------
  // normalizePatternPath(category, file)
  // ../patterns/<category>/<file>.js
  // ----------------------------------------------------------
  normalizePatternPath(category, file) {
    file = file.replace(/\.js$/i, "");
    return `../patterns/${category}/${file}.js`;
  }, // end normalizePatternPath


  // ----------------------------------------------------------
  // normalizeGalleryScript(file)
  // ../gallery/Scripts/<file>.js
  // ----------------------------------------------------------
  normalizeGalleryScript(file) {
    file = file.replace(/\.js$/i, "");
    return `../gallery/Scripts/${file}.js`;
  }, // end normalizeGalleryScript


  // ----------------------------------------------------------
  // normalizeUtilityPath(category, file)
  // ../utilities/<category>/<file>.js
  // ----------------------------------------------------------
  normalizeUtilityPath(category, file) {
    file = file.replace(/\.js$/i, "");
    return `../utilities/${category}/${file}.js`;
  } // end normalizeUtilityPath

}; // end fileLayer
