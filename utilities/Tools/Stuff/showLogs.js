/* ===========================================================
   showLogs.js  - Utilities/Tools script (runPattern)
   -----------------------------------------------------------
   PURPOSE
   -------
   Show newest 10 log files in a radio list (Action panel).
   Selecting a radio displays the log in #text.

   Node tasks used:
     - listLogFiles
     - readLogFile
=========================================================== */

import { nodeListLogFiles, nodeReadLogFile } from "/ui/nodeLayer.js";
import { escapeHtml } from "/ui/ui_utilities";

export async function runPattern() {

  const action = document.getElementById("action");
  if (!action) throw new Error("showLogs: #action missing");

  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("showLogs: #text missing");

  action.innerHTML = "";
  textDiv.innerHTML = "Loading log list...";

  const report = await nodeListLogFiles(10);
  if (!report || report.status !== "ok") {
    throw new Error("showLogs: listLogFiles failed: " + JSON.stringify(report));
  }

  const files = report.files;
  if (!Array.isArray(files)) {
    throw new Error("showLogs: listLogFiles returned files that is not an array");
  }

  renderRadioList(action, files, async (name) => {
    const r = await nodeReadLogFile(name);
    if (!r || r.status !== "ok") {
      throw new Error("showLogs: readLogFile failed: " + JSON.stringify(r));
    }
    renderLogText(textDiv, r.text, name);
  });

  // Default behavior: auto-select newest (first) if any.
  if (files.length > 0) {
    const firstName = files[0].name;
    selectRadioAndLoad(action, firstName);
  } else {
    textDiv.innerHTML = "(No .txt log files found in utilities/logfiles)";
  }

} // end runPattern


function renderRadioList(actionDiv, files, onSelect) {

  const wrap = document.createElement("div");

  // simple header line
  const header = document.createElement("div");
  header.textContent = "Log files (newest first):";
  header.style.marginBottom = "8px";
  wrap.appendChild(header);

  const groupName = "utilities-logfiles";

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (!f || typeof f.name !== "string") {
      throw new Error("showLogs: invalid file entry at index " + i);
    }

    const row = document.createElement("div");
    row.className = "ctrl-field";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = groupName;
    input.value = f.name;
    input.id = "logradio-" + i;

    const label = document.createElement("label");
    label.className = "ctrl-label";
    label.htmlFor = input.id;

    // label text: filename (and optional size)
    label.textContent = formatLogLabel(f.name);


    input.addEventListener("change", async () => {
      if (input.checked) {
        await onSelect(input.value);
      }
    });

    row.appendChild(label);
    row.appendChild(input);
    wrap.appendChild(row);
  }

  actionDiv.appendChild(wrap);

} // end renderRadioList


function selectRadioAndLoad(actionDiv, fileName) {

  const radios = actionDiv.querySelectorAll("input[type='radio']");
  for (let i = 0; i < radios.length; i++) {
    const r = radios[i];
    if (r.value === fileName) {
      r.checked = true;
      r.dispatchEvent(new Event("change"));
      return;
    }
  }

  throw new Error("showLogs: radio not found for: " + fileName);

} // end selectRadioAndLoad

function formatLogLabel(filename) {
  return String(filename)
    .replace(/^newGalleryImages_/, "")
    .replace(/\.txt$/i, "");
} // end formatLogLabel

function renderLogText(textDiv, text, name) {

  // Newest at top is already handled by the list ordering.
  // For display, preserve whitespace.
  const safe = escapeHtml(String(text));

  textDiv.innerHTML =
    "<div style='margin-bottom:8px;'><b>" + escapeHtml(name) + "</b></div>" +
    "<pre style='white-space:pre-wrap; margin:0;'>" + safe + "</pre>";

} // end renderLogText


