/* ui/ui_draw.js
   ------------------------------------------------------------
   Activates Draw tab: builds object list from drawRegistry,
   uses shared canvas (never moved), and manages parameter controls.
   ------------------------------------------------------------ */

let drawCtx = null;
let drawCanvas = null;

/* ------------------------------------------------------------
   Activate and draw selected object
------------------------------------------------------------ */
function activateDrawObject(entry, entryKey) {
  // Ensure we use the shared canvas context
  const cmCtx = (typeof CanvasManager?.getContext === "function")
                  ? CanvasManager.getContext()
                  : null;
  if (cmCtx) {
    window.ctx = cmCtx;
  } else if (window.drawCtx) {
    window.ctx = window.drawCtx;
  } else if (typeof gl === "object" && gl?.ctx) {
    window.ctx = gl.ctx;
  }

  if (!window.ctx) {
    console.warn("activateDrawObject: no ctx");
    return;
  }

  // Clear canvas before drawing
  clearDrawCanvas();

  const thing = entry.create();

  // Apply initial style
  if (entry.params) {
    if (entry.params.color)     window.ctx.strokeStyle = entry.params.color;
    if (entry.params.lineWidth) window.ctx.lineWidth   = entry.params.lineWidth;
  }

  // Draw the object
  entry.draw(thing);

  // Update global state for shell or other usage
  if (typeof gl === "object") {
    gl.currentDraw  = entryKey;
    gl.currentThing = thing;
    gl.currentMode  = "draw";
  }

  ensureTopButtons();
  if (typeof injectOverlayIfNeeded === "function") injectOverlayIfNeeded();
  if (typeof setTitle === "function") setTitle(entry.name);
  customizeOverlayForDraw();
  buildDrawControls(entry, thing);
}

/* ------------------------------------------------------------
   Build UI controls dynamically (uses drawControl container)
------------------------------------------------------------ */
function buildDrawControls(entry, thing) {
  const panel = document.getElementById("drawControl");
  if (!panel) return;

  let body = document.getElementById("controls");
  if (!body) {
    body = document.createElement("div");
    body.id = "controls";
    panel.appendChild(body);
  } else {
    body.innerHTML = "";
  }

  const title = document.createElement("h6");
  title.textContent = "Object Controls";
  body.appendChild(title);

  const controlSpec = entry.controls || {};
  const paramsSpec  = entry.params   || {};

  const keys =
    Object.keys(controlSpec).length > 0
      ? Object.keys(controlSpec)
      : Object.keys(paramsSpec);

  keys.forEach((key) => {
    if (key === "midpoint") return;

    const label = document.createElement("label");
    label.textContent = key;
    label.style.display = "block";
    label.style.marginTop = "0.5rem";
    body.appendChild(label);

    let input;
    const spec = controlSpec[key];
    const val  = (thing.params && key in thing.params) ? thing.params[key] : thing[key];

    if (spec && spec.widget === "slider") {
      input = document.createElement("input");
      input.type  = "range";
      input.min   = spec.min;
      input.max   = spec.max;
      input.step  = spec.step;
      input.value = val;
    } else if (spec && spec.widget === "colorPicker") {
      input = document.createElement("input");
      input.type  = "color";
      input.value = val || "#000000";
    } else if (typeof val === "number") {
      input = document.createElement("input");
      input.type  = "range";
      input.min   = Math.floor((val || 1) * 0.2);
      input.max   = Math.ceil((val || 1) * 2);
      input.step  = Math.max(Math.abs((val || 1) / 50), 1);
      input.value = val || 1;
    } else if (typeof val === "string") {
      input = document.createElement("input");
      input.type  = "text";
      input.value = val;
    } else {
      return;
    }

    input.style.width = "100%";

    input.addEventListener("input", () => {
      let v = input.value;
      if (input.type === "range") v = parseFloat(v);

      if (thing.params && key in thing.params) thing.params[key] = v;
      if (key in thing) thing[key] = v;
      if (entry.params && key in entry.params) entry.params[key] = v;

      clearDrawCanvas();
      if (entry.params) {
        if (entry.params.color)     window.ctx.strokeStyle = entry.params.color;
        if (entry.params.lineWidth) window.ctx.lineWidth   = entry.params.lineWidth;
      }
      entry.draw(thing);
    });

    body.appendChild(input);
  });
}

/* ------------------------------------------------------------
   Inject 1-2-3 buttons above controls
------------------------------------------------------------ */
function ensureTopButtons() {
  const panel = document.getElementById("drawControl");
  if (!panel) return;

  let row = document.getElementById("controlTopButtons");
  if (!row) {
    row = document.createElement("div");
    row.id = "controlTopButtons";
    row.style.display = "grid";
    row.style.gridTemplateColumns = "1fr 1fr 1fr";
    row.style.gap = "8px";
    row.style.margin = "0 0 12px 0";

    const controls = document.getElementById("controls");
    if (controls && controls.parentElement === panel) {
      panel.insertBefore(row, controls);
    } else {
      panel.prepend(row);
    }
  } else {
    const controls = document.getElementById("controls");
    if (controls && row.nextSibling !== controls) {
      row.remove();
      panel.insertBefore(row, controls || panel.firstChild);
    }
    row.innerHTML = "";
  }

  ["1", "2", "3"].forEach((label) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.style.padding = "6px 0";
    btn.style.cursor = "pointer";
    btn.style.background = "#222";
    btn.style.color = "#e5e7eb";
    btn.style.border = "1px solid #444";
    btn.style.borderRadius = "4px";
    btn.style.width = "100%";
    row.appendChild(btn);
  });
}

/* ------------------------------------------------------------
   Redraw helpers
------------------------------------------------------------ */
function redrawCurrent(entry, thing) {
  clearDrawCanvas();
  entry.draw(thing);
}

function clearDrawCanvas(bg = "#ffffff") {
  const c = window.ctx || drawCtx;
  if (!c) return;
  c.save();
  c.fillStyle = bg;
  c.fillRect(0, 0, c.canvas.width, c.canvas.height);
  c.restore();
}

/* ------------------------------------------------------------
   Draw subtab logic
   NOTE: entryKey and entry must be passed in; no name-based lookup.
------------------------------------------------------------ */
function addDrawObjectSubtab(objectName, entryKey, entry) {
  const bar = document.getElementById("drawSubtabBar");
  const content = document.getElementById("drawSubtabContent");
  if (!bar || !content) return;

  const safeKey = String(entryKey).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const tabId   = "draw-" + safeKey;

  // If pane exists, show it
  const existingPane = document.getElementById(tabId);
  if (existingPane) {
    const existingBtn = document.getElementById(`${tabId}-tab`);
    if (existingBtn) new bootstrap.Tab(existingBtn).show();
    return;
  }

  // Create subtab button
  const tabButton = document.createElement("button");
  tabButton.className = "nav-link";
  tabButton.id = `${tabId}-tab`;
  tabButton.type = "button";
  tabButton.role = "tab";
  tabButton.dataset.bsToggle = "tab";
  tabButton.dataset.bsTarget = `#${tabId}`;
  tabButton.textContent = objectName;

  const closeBtn = document.createElement("span");
  closeBtn.textContent = " ×";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.marginLeft = "6px";
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    removeDrawObjectSubtab(tabId);
  };
  tabButton.appendChild(closeBtn);

  const li = document.createElement("li");
  li.className = "nav-item";
  li.appendChild(tabButton);
  bar.appendChild(li);

  // Create subtab pane
  const pane = document.createElement("div");
  pane.id = tabId;
  pane.className = "tab-pane draw-subtab-pane";
  pane.role = "tabpanel";
  pane.dataset.entryKey = entryKey;
  pane._entry = entry; // cache
  content.appendChild(pane);

  // When shown, render from registry
  tabButton.addEventListener("shown.bs.tab", () => {
    // Ensure canvas is in the correct container
    const canvas = CanvasManager.ensureCanvas("canvasContainer");
    if (!canvas) {
      console.warn("CanvasManager.ensureCanvas returned null for", tabId);
      return;
    }

    const ctx = (typeof CanvasManager?.getContext === "function" && CanvasManager.getContext())
                || canvas.getContext("2d");

    drawCanvas = canvas;
    drawCtx    = ctx;
    window.canvas = canvas;
    window.ctx    = ctx;

    if (typeof gl === "object") {
      gl.canvas = canvas;
      gl.ctx    = ctx;
    }

    const e = pane._entry || entry;
    if (e) activateDrawObject(e, entryKey);
  });

  // Show new subtab immediately
  new bootstrap.Tab(tabButton).show();
}

/* ------------------------------------------------------------
   Remove subtab
------------------------------------------------------------ */
function removeDrawObjectSubtab(tabId) {
  const btn  = document.getElementById(`${tabId}-tab`);
  const pane = document.getElementById(tabId);
  if (btn)  btn.parentElement.remove();
  if (pane) pane.remove();

  const bar = document.getElementById("drawSubtabBar");
  if (bar && !bar.querySelector(".nav-link.active")) {
    const categoryTab = document.getElementById("draw-category-tab");
    if (categoryTab) new bootstrap.Tab(categoryTab).show();
  }
}

/* ------------------------------------------------------------
   Handle category selection
------------------------------------------------------------ */
function handleCategorySelection(objectName, entryKey) {
  const entry = window.drawRegistry?.[entryKey];
  if (!entry) {
    console.warn("handleCategorySelection: missing entry for key", entryKey);
    return;
  }
  addDrawObjectSubtab(objectName, entryKey, entry);
}

/* ------------------------------------------------------------
   Overlay customization (if any)
------------------------------------------------------------ */
function customizeOverlayForDraw() {
  const controls = document.getElementById("overlayControls");
  if (!controls) return;
  controls.innerHTML = "";

  ["Button1", "Button2"].forEach((label) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    controls.appendChild(btn);
  });
}

/* ------------------------------------------------------------
   Init
------------------------------------------------------------ */
function initDrawTab() {
  // no-op (minimal)
}

// Export to global
window.handleCategorySelection = handleCategorySelection;
window.initDrawTab = initDrawTab;
