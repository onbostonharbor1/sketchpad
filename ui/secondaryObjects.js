/* ui/secondaryObjects.js
   ------------------------------------------------------------
   Service Bridge for Secondary Object Management
   ------------------------------------------------------------
*/

import { nodeDispatch } from "./nodeLayer.js";

/* ------------------------------------------------------------
   saveSecondary(primaryId, name, dataPayload, thumbBase64)
   ------------------------------------------------------------
   Persists a secondary object configuration + thumbnail.

   arguments:
     primaryId:   string (e.g. "bird")
     name:        string (e.g. "My Bird Variation")
     dataPayload: object (the full JSON structure to save)
     thumbBase64: string (base64 encoded PNG, no prefix)
------------------------------------------------------------ */
export async function saveSecondary(primaryId, name, dataPayload, thumbBase64) {
  if (!primaryId || !name || !dataPayload || !thumbBase64) {
    throw new Error("saveSecondary: missing arguments");
  }

  return await nodeDispatch("saveSecondaryObject", {
    primaryId,
    name,
    payload: dataPayload,
    thumbBase64
  });
}

/* ------------------------------------------------------------
   archiveSecondary(primaryId, filename)
   ------------------------------------------------------------
   Moves a secondary object to the archive folder.
------------------------------------------------------------ */
export async function archiveSecondary(primaryId, filename) {
  if (!primaryId || !filename) {
    throw new Error("archiveSecondary: missing arguments");
  }

  return await nodeDispatch("archiveSecondaryObject", {
    primaryId,
    filename
  });
}

/* ------------------------------------------------------------
   listSecondaries(primaryId)
   ------------------------------------------------------------
   Returns the manifest array for a given primary ID.
------------------------------------------------------------ */
export async function listSecondaries(primaryId) {
  if (!primaryId) {
    throw new Error("listSecondaries: primaryId missing");
  }

  const result = await nodeDispatch("getSecondaryManifest", { primaryId });
  return result.manifest || [];
}

/* ------------------------------------------------------------
   getIDsWithSecondaries()
   ------------------------------------------------------------
   Returns an array of primary IDs that possess at least one
   secondary object.
------------------------------------------------------------ */
export async function getIDsWithSecondaries() {
  const result = await nodeDispatch("getPrimaryObjectsWithSecondaries", {});
  return result.ids || [];
}

/* ------------------------------------------------------------
   loadSecondary(primaryId, filename)
   ------------------------------------------------------------
   Fetches the JSON content of a secondary object.
------------------------------------------------------------ */
export async function loadSecondary(primaryId, filename) {
  if (!primaryId || !filename) {
    throw new Error("loadSecondary: missing arguments");
  }

  const result = await nodeDispatch("readSecondaryObject", {
    primaryId,
    filename
  });

  return result.content;
}
