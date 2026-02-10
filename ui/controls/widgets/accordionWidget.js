/* controls/widgets/accordionWidget.js
   ============================================================
   ACCORDION WIDGET
   ============================================================ */

import { CONTROL_CLASSES } from "../shared/constants.js";
import { buildSingleControl } from "../rendering/renderer.js";

export function setAccordionControl(field, label, def, value, info, key, tabId) {

  if (!field) throw new Error("setAccordionControl: field missing");
  if (!def) throw new Error("setAccordionControl: def missing for key " + key);
  if (!info) throw new Error("setAccordionControl: info missing for key " + key);
  if (!info.parameters) throw new Error("setAccordionControl: info.parameters missing for key " + key);
  // Note: redrawHandler may not be set yet during initial render, so we don't check it here
  if (!tabId) throw new Error("setAccordionControl: tabId missing");
  if (!key) throw new Error("setAccordionControl: key missing");

  if (!window.bootstrap) {
    throw new Error("setAccordionControl: Bootstrap JS (window.bootstrap) not found");
  }

  const sections = def.sections;
  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    throw new Error("setAccordionControl: def.sections missing/invalid for key " + key);
  }

  // Default CLOSED unless explicitly requested.
  const startOpen = (def.startOpen === true);

  // Full-width wrapper (accordion manages its own layout)
  const wrap = document.createElement("div");
  wrap.className = "ctrl-accordion-wrap";
  wrap.style.gridColumn = "1 / -1";

  const acc = document.createElement("div");
  acc.className = "accordion";
  acc.id = tabId + "-" + key + "-accordion";

  for (let i = 0; i < sections.length; i++) {

    const sec = sections[i];
    if (!sec) throw new Error("setAccordionControl: missing section at index " + i + " for key " + key);

    if (typeof sec.title !== "string" || sec.title.trim() === "") {
      throw new Error("setAccordionControl: section.title missing/invalid at index " + i + " for key " + key);
    }

    const hasItems = (sec.items !== undefined);
    const hasControls = (sec.controls !== undefined);

    if (hasItems) {
      if (!Array.isArray(sec.items)) {
        throw new Error("setAccordionControl: section.items must be an array at index " + i + " for key " + key);
      }
    }

    if (hasControls) {
      if (!sec.controls || typeof sec.controls !== "object") {
        throw new Error("setAccordionControl: section.controls missing/invalid at index " + i + " for key " + key);
      }
    }

    if (!hasItems && !hasControls) {
      throw new Error("setAccordionControl: section must define items and/or controls at index " + i + " for key " + key);
    }

    const item = document.createElement("div");
    item.className = "accordion-item";

    const h2 = document.createElement("h2");
    h2.className = "accordion-header";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "accordion-button";
    if (!startOpen) btn.classList.add("collapsed");
    btn.textContent = sec.title;

    const collapseId = tabId + "-" + key + "-collapse-" + i;
    btn.setAttribute("data-bs-toggle", "collapse");
    btn.setAttribute("data-bs-target", "#" + collapseId);
    btn.setAttribute("aria-expanded", startOpen ? "true" : "false");
    btn.setAttribute("aria-controls", collapseId);

    h2.appendChild(btn);

    const bodyWrap = document.createElement("div");
    bodyWrap.id = collapseId;
    bodyWrap.className = "accordion-collapse collapse" + (startOpen ? " show" : "");
    bodyWrap.setAttribute("data-bs-parent", "#" + acc.id);

    const body = document.createElement("div");
    body.className = "accordion-body";

    // --------------------------------------------------------
    // 1) OPTIONAL: Render a categories-style clickable list
    // --------------------------------------------------------
    if (hasItems) {

      const list = document.createElement("div");
      list.className = (typeof sec.listClass === "string" && sec.listClass.trim() !== "")
        ? sec.listClass
        : "ctrl-accordion-list";

      for (let j = 0; j < sec.items.length; j++) {

        const it = sec.items[j];
        if (!it) throw new Error("setAccordionControl: missing item at section " + i + " index " + j);

        if (typeof it.label !== "string" || it.label.trim() === "") {
          throw new Error("setAccordionControl: item.label missing/invalid at section " + i + " index " + j);
        }

        if (typeof it.action !== "function") {
          throw new Error("setAccordionControl: item.action missing/invalid for '" + it.label + "'");
        }

        const row = document.createElement("div");
        row.className = (typeof sec.itemClass === "string" && sec.itemClass.trim() !== "")
          ? sec.itemClass
          : "ctrl-accordion-item";

        row.textContent = it.label;
        row.style.cursor = "pointer";

        // CLICK LISTENER WITH SYSTEM-LEVEL CLEARING
        row.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          // If the accordion definition includes clearOnAction,
          // handle the canvas housekeeping here.
          if (def.clearOnAction === true) {
            const canvas = document.getElementById("sharedCanvas");
            if (canvas) {
              const ctx = canvas.getContext("2d");
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
          }

          it.action();
        });

        list.appendChild(row);

        // separator line
        if (j !== sec.items.length - 1) {
          const hr = document.createElement("hr");
          hr.className = "ctrl-accordion-sep";
          list.appendChild(hr);
        }
      }

      body.appendChild(list);
    }

    // --------------------------------------------------------
    // 2) OPTIONAL: Render nested parameter controls (original)
    // --------------------------------------------------------
    if (hasControls) {

      const innerKeys = Object.keys(sec.controls);

      for (let k = 0; k < innerKeys.length; k++) {

        const innerKey = innerKeys[k];
        const innerDef = sec.controls[innerKey];

        if (!innerDef) {
          throw new Error("setAccordionControl: missing innerDef for key " + innerKey);
        }

        const innerValue =
          (info.parameters[innerKey] !== undefined) ? info.parameters[innerKey]
          : (innerDef.default !== undefined) ? innerDef.default
          : "";

        let passValue = innerValue;

        if (innerDef.widget === "button") {
          passValue = {
            widget: "button",
            action: innerDef.action,
            redraw: (innerDef.redraw !== undefined) ? innerDef.redraw : false
          };
        }

        const innerField = buildSingleControl(
          info,
          innerKey,
          innerDef,
          passValue,
          tabId
        );

        if (innerField) body.appendChild(innerField);
      }
    }

    bodyWrap.appendChild(body);

    item.appendChild(h2);
    item.appendChild(bodyWrap);

    acc.appendChild(item);
  }

  // Optional redraw on accordion toggle
  if (def.redrawOnToggle === true) {
    acc.addEventListener("shown.bs.collapse", () => {
      if (typeof info.redrawHandler === "function") info.redrawHandler();
    });
    acc.addEventListener("hidden.bs.collapse", () => {
      if (typeof info.redrawHandler === "function") info.redrawHandler();
    });
  }

  wrap.appendChild(acc);
  field.appendChild(wrap);

} // end setAccordionControl


/* ------------------------------------------------------------
   setThumbnailGridControl()

   DESCRIPTION
   -----------
   Renders a grid of clickable thumbnails.
   Intended for use in the Offcanvas for Secondary Objects.

   def.options: [ { value, label, src }, ... ]
------------------------------------------------------------ */

