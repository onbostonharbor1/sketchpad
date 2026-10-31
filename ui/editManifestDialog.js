/* ===========================================================
   editManifestDialog.js
   -----------------------------------------------------------
   The Edit Manifest dialog: change one entry's title and status. It knows nothing about tabs;
   it works on manifestPath + identity + editable fields.
   Needs: the overlayManager "forms" layer, and nodeDispatch running "editManifestEntry".
   =========================================================== */

import { nodeDispatch } from "./nodeLayer.js";
import { overlayManager } from "./overlay.js";
import { escapeHtml } from "/ui/htmlText.js";
import { manifest } from "./manifest.js";

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
        fileLabel     (string)
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
    buildEditManifestHtml - TABLE LAYOUT (REFINED)
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
    wireEditManifestHandlers - UPDATED (NO UseCustom BUTTON)
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

  // Clicking or typing in the custom status box selects its radio.
  // (The text input sits inside the radio's label, but a click on a
  // nested input does not activate the label's control.)
  const selectCustomRadio = () => {
    for (let i = 0; i < radios.length; i++) {
      if (String(radios[i].value) === "__custom__") radios[i].checked = true;
    }
  };
  customInput.addEventListener("focus", selectCustomRadio);
  customInput.addEventListener("input", selectCustomRadio);

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

  // The manifest on disk changed; drop the cached category/status maps
  // so Home, Gallery and the other tabs read the edited entry.
  manifest.clearCache();

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

/* ============================================================
    escapeAttr(s)
=========================================================== */
function escapeAttr(s) {
  return escapeHtml(s);
} // end escapeAttr
