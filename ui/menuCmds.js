/* ui/menuCmds.js
   ------------------------------------------------------------
   Shared Menu Commands — Generic Dialogs
   ------------------------------------------------------------
   Purpose:
     - Provide shared UI dialogs used by multiple tabs.
     - This file knows nothing about tabs; it only operates on
       manifestPath + identity + editable fields.

   Current dialog:
     - openEditManifestDialog(spec)

   Requirements:
     - overlayManager exists and has a "forms" layer.
     - nodeDispatch exists and can run "editManifestEntry".
*/

import { nodeDispatch } from "./nodeLayer.js";
import { overlayManager } from "./overlay.js";
import { showHelpOverlay } from "./overlay.js";
import { escapeHtml } from "./ui_utilities.js";


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
  // Compat:    { manifestPath, filename }
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

  // Default success alert (restores yesterday’s behavior)
  const showAlert = (spec.showAlert !== false);
  if (showAlert) {
    alert("Archived: " + filename);
  }

  if (spec.onSuccess) {
    await spec.onSuccess(result);
  }

  return result;

} // end archiveItem








/* ============================================================
   openEditManifestDialog(spec)
   ------------------------------------------------------------
   Opens the shared "Edit Manifest" dialog.

   Args:
     spec (object) with:
       dialogTitle (string)
       manifestPath (string)
       matchField   (string)
       matchValue   (string)
       fileLabel    (string)
       initialTitle (string)
       initialStatus (string)
       statusPresets (array of strings)
       allowCustomStatus (bool)
       allowClearStatus  (bool)

   Returns:
     Promise<boolean>
       true  => OK applied (manifest rewritten)
       false => Cancel

   Side effects:
     - On OK, updates:
         spec._resultTitle
         spec._resultStatus
=========================================================== */
export function openEditManifestDialog(spec) {

  validateEditManifestSpec(spec);

  return new Promise((resolve) => {

    const container = document.getElementById("overlayContainer");
    if (!container) throw new Error("openEditManifestDialog: overlayContainer missing");

    const titleEl = document.getElementById("overlayTitle");
    if (!titleEl) throw new Error("openEditManifestDialog: overlayTitle missing");

    container.style.display = "block";
    titleEl.textContent = spec.dialogTitle || "Edit Manifest";

    overlayManager.show("forms", buildEditManifestHtml(spec));

    wireEditManifestHandlers(spec, resolve);

  });

} // end openEditManifestDialog


/* ============================================================
   validateEditManifestSpec(spec)
=========================================================== */
function validateEditManifestSpec(spec) {

  if (!spec) throw new Error("validateEditManifestSpec: spec missing");

  if (typeof spec.manifestPath !== "string" || spec.manifestPath.trim() === "") {
    throw new Error("validateEditManifestSpec: spec.manifestPath missing");
  }

  if (typeof spec.matchField !== "string" || spec.matchField.trim() === "") {
    throw new Error("validateEditManifestSpec: spec.matchField missing");
  }

  if (typeof spec.matchValue !== "string" || spec.matchValue.trim() === "") {
    throw new Error("validateEditManifestSpec: spec.matchValue missing");
  }

  if (!Array.isArray(spec.statusPresets)) {
    throw new Error("validateEditManifestSpec: spec.statusPresets must be an array");
  }

} // end validateEditManifestSpec

/* ============================================================
   buildEditManifestHtml — TABLE LAYOUT (REFINED)
=========================================================== */
function buildEditManifestHtml(spec) {

  const presets       = spec.statusPresets || [];
  const initialTitle  = spec.initialTitle || "";
  const initialStatus = spec.initialStatus || "";

  let radios = "";
  let presetMatched = false;

  for (let i = 0; i < presets.length; i++) {
    const s  = presets[i];
    const id = "statusPreset_" + i;
    const checked = (s === initialStatus);
    if (checked) presetMatched = true;

    radios +=
      "<div>" +
        "<label>" +
          "<input type='radio' name='statusPreset' id='" + id + "' " +
                 "value='" + escapeAttr(s) + "'" +
                 (checked ? " checked" : "") + " /> " +
          escapeHtml(s) +
        "</label>" +
      "</div>";
  }

  // Custom radio (selected if no preset matched but status exists)
  const customChecked =
    (!presetMatched && initialStatus !== "");

  return `
<table cellpadding="6" cellspacing="0" style="width:100%">

  <tr>
    <td align="right"><b>File</b></td>
    <td><b>${escapeHtml(spec.fileLabel || spec.matchValue)}</b></td>
  </tr>

  <tr>
    <td align="right"><b>Title</b></td>
    <td>
      <input id="editManifestTitle"
             type="text"
             value="${escapeAttr(initialTitle)}"
             style="width:100%" />
    </td>
  </tr>

  <tr>
    <td align="right" valign="top"><b>Status</b></td>
    <td>
      ${radios}
      <div style="margin-top:6px">
        <label>
          <input type="radio" name="statusPreset"
                 value="__custom__"
                 ${customChecked ? "checked" : ""} />
          <input id="editManifestCustomStatus"
                 type="text"
                 placeholder="Custom status"
                 value="${customChecked ? escapeAttr(initialStatus) : ""}"
                 style="width:70%; margin-left:6px" />
        </label>
      </div>
    </td>
  </tr>

  <tr>
    <td align="right"><b>Clear Status</b></td>
    <td>
      <input id="editManifestClearStatus" type="checkbox" />
    </td>
  </tr>

  <tr>
    <td></td>
    <td>
      <button id="editManifestOk" type="button">OK</button>
      <button id="editManifestCancel" type="button">Cancel</button>
    </td>
  </tr>

</table>
`;
} // end buildEditManifestHtml




/* ============================================================
   wireEditManifestHandlers — UPDATED (NO UseCustom BUTTON)
=========================================================== */
function wireEditManifestHandlers(spec, resolve) {

  const titleInput  = document.getElementById("editManifestTitle");
  const customInput = document.getElementById("editManifestCustomStatus");
  const clearCb     = document.getElementById("editManifestClearStatus");
  const okBtn       = document.getElementById("editManifestOk");
  const cancelBtn   = document.getElementById("editManifestCancel");

  if (!titleInput)  throw new Error("wireEditManifestHandlers: editManifestTitle missing");
  if (!customInput) throw new Error("wireEditManifestHandlers: editManifestCustomStatus missing");
  if (!clearCb)     throw new Error("wireEditManifestHandlers: editManifestClearStatus missing");
  if (!okBtn)       throw new Error("wireEditManifestHandlers: editManifestOk missing");
  if (!cancelBtn)   throw new Error("wireEditManifestHandlers: editManifestCancel missing");

  // ------------------------------------------------------------
  // Initialize fields (FAIL-FAST)
  // ------------------------------------------------------------
  titleInput.value = String(spec.initialTitle || "");

  clearCb.checked = false;

  const initialStatus = String(spec.initialStatus || "").trim();

  const radios = document.querySelectorAll("input[name='statusPreset']");
  if (!radios || radios.length === 0) throw new Error("wireEditManifestHandlers: statusPreset radios missing");

  // clear all radios first
  for (let i = 0; i < radios.length; i++) {
    radios[i].checked = false;
  }

  // try to match a preset radio by value
  let matchedPreset = false;
  for (let i = 0; i < radios.length; i++) {
    if (String(radios[i].value) === initialStatus && initialStatus !== "") {
      radios[i].checked = true;
      matchedPreset = true;
      break;
    }
  }

  // if no preset matched and there IS a status, select custom + seed custom text
  if (!matchedPreset && initialStatus !== "") {

    let customRadio = null;

    for (let i = 0; i < radios.length; i++) {
      if (String(radios[i].value) === "__custom__") {
        customRadio = radios[i];
        break;
      }
    }

    if (!customRadio) throw new Error("wireEditManifestHandlers: __custom__ radio missing");

    customRadio.checked = true;
    customInput.value = initialStatus;

  } else {

    // if a preset matched (or status empty), do not seed custom
    customInput.value = "";

  }

  // ------------------------------------------------------------
  // Events
  // ------------------------------------------------------------

  cancelBtn.onclick = () => {
    closeFormsOverlay();
    resolve(false);
  };

  okBtn.onclick = async () => {
    await applyEditManifest(spec, resolve);
  };

  titleInput.addEventListener("keydown", async (ev) => {
    if (ev.key === "Enter") {
      await applyEditManifest(spec, resolve);
    }
  });

  customInput.addEventListener("keydown", async (ev) => {
    if (ev.key === "Enter") {
      await applyEditManifest(spec, resolve);
    }
  });

} // end wireEditManifestHandlers




export async function applyEditManifest(spec, resolve) {

  if (!spec) throw new Error("applyEditManifest: spec missing");
  if (!spec.manifestPath) throw new Error("applyEditManifest: spec.manifestPath missing");
  if (!spec.matchField) throw new Error("applyEditManifest: spec.matchField missing");
  if (!spec.matchValue) throw new Error("applyEditManifest: spec.matchValue missing");

  const titleEl       = document.getElementById("editManifestTitle");
  const clearStatusEl = document.getElementById("editManifestClearStatus");
  const customEl      = document.getElementById("editManifestCustomStatus");

  if (!titleEl) throw new Error("applyEditManifest: editManifestTitle missing");
  if (!clearStatusEl) throw new Error("applyEditManifest: editManifestClearStatus missing");
  if (!customEl) throw new Error("applyEditManifest: editManifestCustomStatus missing");

  const newTitle = String(titleEl.value || "").trim();

  let newStatus = "";

  if (clearStatusEl.checked) {

    newStatus = "";

  } else {

    // status radios are: input[name="statusPreset"] with values = preset strings OR "__custom__"
    const nodes = document.querySelectorAll("input[name='statusPreset']");
    if (!nodes || nodes.length === 0) throw new Error("applyEditManifest: statusPreset radios missing");

    let picked = "";
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].checked) {
        picked = String(nodes[i].value || "");
        break;
      }
    }

    if (picked === "__custom__") {

      const s = String(customEl.value || "").trim();
      if (s === "") throw new Error("applyEditManifest: custom status is empty");
      if (s === "__custom__") throw new Error("applyEditManifest: invalid custom status token");
      newStatus = s;

    } else {

      newStatus = picked;

    }
  }

  const payload = {
    manifestPath : spec.manifestPath,
    matchField   : spec.matchField,
    matchValue   : spec.matchValue,
    title        : newTitle,
    status       : newStatus
  };

  const result = await nodeDispatch("editManifestEntry", payload);

  if (!result || result.status !== "ok") {
    throw new Error("applyEditManifest: editManifestEntry failed: " + JSON.stringify(result));
  }
  if (result.request !== "editManifestEntry") {
    throw new Error("applyEditManifest: unexpected response: " + JSON.stringify(result));
  }

  spec._resultTitle  = newTitle;
  spec._resultStatus = newStatus;

  closeFormsOverlay();
  resolve(true);

} // end applyEditManifest




/* ============================================================
   preselectStatus(initialStatus, presets)
=========================================================== */
function preselectStatus(initialStatus, presets) {

  if (!initialStatus) return;

  for (let i = 0; i < presets.length; i++) {
    const id = "statusPreset_" + i;
    const el = document.getElementById(id);
    if (!el) continue;

    if (el.value === initialStatus) {
      el.checked = true;
      return;
    }
  }

} // end preselectStatus


/* ============================================================
   clearStatusRadios()
=========================================================== */
function clearStatusRadios() {

  const nodes = document.querySelectorAll("input[name='statusPreset']");
  if (!nodes) return;

  nodes.forEach((n) => {
    n.checked = false;
  });

} // end clearStatusRadios


/* ============================================================
   getPickedRadioValue()
=========================================================== */
function getPickedRadioValue() {

  const nodes = document.querySelectorAll("input[name='statusPreset']");
  if (!nodes) return "";

  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].checked) return nodes[i].value;
  }

  return "";

} // end getPickedRadioValue


/* ============================================================
   closeFormsOverlay()
=========================================================== */
function closeFormsOverlay() {

  const container = document.getElementById("overlayContainer");
  if (!container) throw new Error("closeFormsOverlay: overlayContainer missing");

  overlayManager.clearLayer("forms");
  container.style.display = "none";

} // end closeFormsOverlay



/* ------------------------------------------------------------
   showScriptOffcanvas(scriptPath, titleText)
   Fetches script source and displays it inside the Bootstrap
   offcanvas panel. Offcanvas is appropriate for long, scrollable
   text that should not block the app.
------------------------------------------------------------ */
export function showScriptOffcanvas(scriptPath, titleText) {

  if (!scriptPath) throw new Error("showScriptOffcanvas: scriptPath missing");

  fetch(scriptPath)
    .then((resp) => {
      if (!resp.ok) {
        throw new Error("showScriptOffcanvas: fetch failed " + resp.status + " for " + scriptPath);
      }
      return resp.text();
    })
    .then((text) => {

      const panel = document.getElementById("offcanvasPanel");
      if (!panel) throw new Error("showScriptOffcanvas: offcanvasPanel not found");

      const body = panel.querySelector(".offcanvas-body");
      if (!body) throw new Error("showScriptOffcanvas: .offcanvas-body missing");

      const titleEl = panel.querySelector(".offcanvas-title");
      if (titleEl) {
        titleEl.textContent = (titleText || "(untitled)") + " Script";
      }

      body.innerHTML = "";

      const pre = document.createElement("pre");
      pre.style.whiteSpace = "pre-wrap";
      pre.style.fontSize = "0.85rem";

      // IMPORTANT: textContent already displays code literally.
      pre.textContent = text;

      body.appendChild(pre);

      const bsCanvas = new bootstrap.Offcanvas(panel);
      bsCanvas.show();
    });

} // end showScriptOffcanvas

/* ============================================================
   escapeAttr(s)
=========================================================== */
function escapeAttr(s) {
  return escapeHtml(s);
} // end escapeAttr


// end menuCmds.js
