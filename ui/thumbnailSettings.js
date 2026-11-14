/* ui/thumbnailSettings.js
   ------------------------------------------------------------
   Thumbnails in the category lists: the on/off switch, the size they are
   shown at, and where each kind of item keeps its picture.

   The settings live in uiState.thumbnails ({ on, size }). They are also
   kept in the browser's localStorage so that they survive a reload; if
   localStorage is not available the settings just last for the session.

   The picture files are PNGs of THUMB_FILE_SIZE pixels, made by the
   Thumbnails utilities (Utilities > Tools > Thumbnails) and when an item is
   saved. The size on screen is separate: changing it never remakes a file.

   Where the pictures are (all named thumb_<name>.png in an images folder):
     Patterns       /patterns/<category>/images/
     Gallery        /gallery/<Ideabook|Patterns|Scripts>/<category>/images/
     Figures        /figures/<category>/images/
     Draw objects   /drawRegistry/<key>/images/    (thumb_<key>.png)

   Exports:
     THUMB_FILE_SIZE, THUMB_MIN_SIZE, THUMB_MAX_SIZE
     loadThumbnailSettings()      read the saved settings into uiState
     setThumbnailsOn(on)          also makes the other tabs redraw their lists
     setThumbnailSize(px)         likewise
     patternsThumb(category, name)
     galleryThumb(domain, category, name)
     figureThumb(category, name)
     drawThumb(key)
     thumbFromEntryPath(path)     the picture for a Home entry, from its path
   ------------------------------------------------------------ */

import { uiState } from "/ui/uiState.js";

export const THUMB_FILE_SIZE = 200;     // pixels, square, of the PNG files
export const THUMB_MIN_SIZE  = 40;
export const THUMB_MAX_SIZE  = 200;     // larger would only stretch the files

const STORAGE_KEY = "sketchpad.thumbnails";


/* ------------------------------------------------------------
   loadThumbnailSettings()
   Called once when this file loads (below).
   ------------------------------------------------------------ */
export function loadThumbnailSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (typeof saved.on === "boolean") uiState.thumbnails.on = saved.on;
    if (Number.isFinite(saved.size)) {
      uiState.thumbnails.size = Math.min(THUMB_MAX_SIZE, Math.max(THUMB_MIN_SIZE, Math.round(saved.size)));
    }
  } catch (err) {
    // No localStorage, or unreadable text: keep the defaults.
  }
} // end loadThumbnailSettings

/* saveThumbnailSettings: keeps the thumbnail settings in the browser (on or off, size). */
function saveThumbnailSettings() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(uiState.thumbnails));
  } catch (err) {
    // Not available: the settings last for this session only.
  }
} // end saveThumbnailSettings


/* setThumbnailsOn: turns pictures in the category lists on or off. */
export function setThumbnailsOn(on) {
  uiState.thumbnails.on = !!on;
  saveThumbnailSettings();
  markListsForRedraw();
} // end setThumbnailsOn


// Returns the size actually set (clamped and rounded).
export function setThumbnailSize(px) {
  const n = Math.round(Number(px));
  if (!Number.isFinite(n)) throw new Error("setThumbnailSize: not a number: " + px);
  uiState.thumbnails.size = Math.min(THUMB_MAX_SIZE, Math.max(THUMB_MIN_SIZE, n));
  saveThumbnailSettings();
  markListsForRedraw();
  return uiState.thumbnails.size;
} // end setThumbnailSize


/* ------------------------------------------------------------
   markListsForRedraw()
   Each tab that lists its items with pictures builds its list again the next
   time it is opened (the same needsUpdate flag a manifest rebuild uses). The
   manifest cache is left alone, and so is Utilities, whose lists show names.
   ------------------------------------------------------------ */
function markListsForRedraw() {
  for (const tab of ["home", "draw", "patterns", "gallery", "figures"]) {
    if (uiState[tab]) uiState[tab].needsUpdate = true;
  }
} // end markListsForRedraw


/* ------------------------------------------------------------
   Picture paths. A name may hold spaces, so each part is encoded.
   ------------------------------------------------------------ */
// encodeURIComponent, except that "&" and "," stay as they are: they are legal in a path, and
// Vite answers the encoded forms (%26, %2C) with the app's home page instead of the picture, so a
// name such as "Aqua & Yellow Spiral Mandala, Modern Boho Decor" would show no thumbnail.
const enc = (s) => encodeURIComponent(s).replace(/%26/g, "&").replace(/%2C/gi, ",");

/* patternsThumb: where a pattern's thumbnail picture is. */
export function patternsThumb(category, name) {
  return "/patterns/" + enc(category) + "/images/thumb_" + enc(name) + ".png";
}

/* galleryThumb: where a gallery item's thumbnail picture is. */
export function galleryThumb(domain, category, name) {
  return "/gallery/" + enc(domain) + "/" + enc(category) + "/images/thumb_" + enc(name) + ".png";
}

/* figureThumb: where a figure's thumbnail picture is. */
export function figureThumb(category, name) {
  return "/figures/" + enc(category) + "/images/thumb_" + enc(name) + ".png";
}

/* drawThumb: where a Draw object's thumbnail picture is. */
export function drawThumb(key) {
  return "/drawRegistry/" + enc(key) + "/images/thumb_" + enc(key) + ".png";
}


/* ------------------------------------------------------------
   thumbFromEntryPath(path)
   Home lists entries from every tab, each with the path of its file:
     /patterns/<category>/<name>.js
     /gallery/<domain>/<category>/<name>.js (or an image)
     /figures/<category>/<name>.json
   Returns the picture's path, or null when the entry has none (for
   example a Utilities tool).
   ------------------------------------------------------------ */
export function thumbFromEntryPath(path) {
  if (typeof path !== "string") return null;
  const parts = path.split("/");                       // "", "patterns", category, file
  const stem = (f) => f.replace(/\.[^.]+$/, "");
  if (parts[1] === "patterns" && parts.length === 4) return patternsThumb(parts[2], stem(parts[3]));
  if (parts[1] === "gallery"  && parts.length === 5) return galleryThumb(parts[2], parts[3], stem(parts[4]));
  if (parts[1] === "figures"  && parts.length === 4) return figureThumb(parts[2], stem(parts[3]));
  return null;
} // end thumbFromEntryPath


loadThumbnailSettings();

// end thumbnailSettings.js
