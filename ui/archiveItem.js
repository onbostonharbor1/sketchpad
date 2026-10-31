/* ===========================================================
   archiveItem.js
   -----------------------------------------------------------
   archiveItem(): ask the Node service to move a file to archive/ and drop its manifest entry,
   then refresh. Shared by the Patterns, Gallery and Utilities menus.
   =========================================================== */

import { nodeDispatch } from "./nodeLayer.js";
import { manifest } from "./manifest.js";

/* ============================================================
    archiveItem(specOrPayload)
    ------------------------------------------------------------
    Canonical call:
      await archiveItem({
        payload: { manifestPath, filename },
        onSuccess: async (result) => { ... },
        showAlert: true   // default true
      });

    Compatibility:
      await archiveItem({ manifestPath, filename });

    Default behavior:
      - after successful archive, show alert "Archived: <filename>"
      - caller may suppress via showAlert: false
=========================================================== */
export async function archiveItem(specOrPayload) {

  if (!specOrPayload)
    throw new Error("archiveItem: spec missing");

  // Canonical: { payload: {...}, onSuccess?: fn, showAlert?: bool }
  // Compat:     { manifestPath, filename }
  let spec = specOrPayload;
  if (!specOrPayload.payload) {
    spec = { payload: specOrPayload };
  }

  if (!spec.payload)
    throw new Error("archiveItem: payload missing");

  const manifestPath = spec.payload.manifestPath;
  const filename     = spec.payload.filename;

  if (!manifestPath)
    throw new Error("archiveItem: manifestPath missing");

  if (!filename)
    throw new Error("archiveItem: filename missing");

  const result = await nodeDispatch(
    "archiveItem",
    { manifestPath, filename }
  );

  // Default success alert (restores yesterday's behavior)
  const showAlert = (spec.showAlert !== false);
  if (showAlert) {
    alert("Archived: " + filename);
  }

  if (spec.onSuccess) {
    await spec.onSuccess(result);
  }

  return result;

} // end archiveItem
