/* ui/logging.js
   ------------------------------------------------------------
   Logging + Structure Checks (OPTIONAL DEBUG SUBSYSTEM)

   ============================================================
   OVERVIEW
   ============================================================

   This file contains two independent features:

   1) checkStructure(spec)
      Fail-fast structural assertions for invariant DOM + ctx.
      - NO REPAIR. Any failure throws immediately.
      - Intended usage: call once early in startup (e.g., setUI.js).

   2) OPTIONAL Debug Log Overlay (DISABLED UNTIL INSTALLED)
      A floating, on-screen debug log panel for trace messages and
      for "object traced" breadcrumbs.

      Goals:
        - Avoid console.log for routine trace messages.
        - Provide a visible on-screen log that does not require DevTools.
        - Preserve the main advantage of console logging for objects:
          objects are still sent to the console so you can expand them.
        - The panel is created ONLY on the first log call (lazy init).
        - No structural repair, no silent fallbacks: if document.body
          is missing (should be impossible in normal use), it will throw.

      Behavior:
        - log("text") appends a timestamped line to the floating panel.
        - logObj("label", obj) appends: "TRACED OBJECT: label (see console)"
          and also calls console.log(label, obj) for expandable inspection.
        - clearLog() clears the panel if it exists.
        - showLog()/hideLog() toggles visibility if it exists.

   ============================================================
   HOW TO ACTIVATE (IF YOU CHOOSE TO)
   ============================================================

   You have two activation approaches:

   A) Import-and-call (ES-module explicit use)
      In any file that wants logging:
        import { log, logObj } from "./logging.js";
        log("message");
        logObj("uiState", window.uiState);

      Pros: explicit, no globals.
      Cons: requires imports in each file that uses logging.

   B) Install globals ONCE (no imports elsewhere)
      In a startup file that always runs once (e.g., setUI.js):
        import { installLoggingGlobals } from "./logging.js";
        installLoggingGlobals();

      Then anywhere (any module) you can use:
        window.log("message");
        window.logObj("uiState", window.uiState);

      Pros: no imports everywhere; easiest incremental adoption.
      Cons: introduces a few window.* names.

   This file includes installLoggingGlobals(), but DOES NOT call it.
   Until you call installLoggingGlobals(), nothing is added to window.
   Even if you do not activate the overlay, you can still keep the CSS
   and the exported functions harmlessly.

   ============================================================
   CSS
   ============================================================

   This JS expects CSS classes/IDs defined in /css/logging.css:

     #debugLogOverlay
     #debugLogOverlay .debuglog-panel
     #debugLogOverlay .debuglog-header
     #debugLogOverlay .debuglog-title
     #debugLogOverlay .debuglog-controls button
     #debugLogOverlay .debuglog-body
     #debugLogOverlay .debuglog-line

   The overlay will still function without CSS, but it will be ugly.

   ------------------------------------------------------------ */


export function ensurePanicCssLoaded() {
  const id = "panic-css-link";

  const existing = document.getElementById(id);
  if (existing) return;

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = "/css/logging.css";

  document.head.appendChild(link);
} // end ensurePanicCssLoaded


let panicInstalled = false;
let panicShown = false;

export function installPanicHandlers() {
  if (panicInstalled) return;
  panicInstalled = true;

  ensurePanicCssLoaded();

  window.addEventListener("error", onWindowError, true);
  window.addEventListener("unhandledrejection", onUnhandledRejection, true);
} // end installPanicHandlers

function onWindowError(ev) {
  const err = ev.error || new Error(ev.message || "Unknown window error");
  const details = formatWindowErrorDetails(ev, err);

  showPanicDialog(details);
} // end onWindowError

function onUnhandledRejection(ev) {
  const reason = ev.reason;
  const details = formatUnhandledRejectionDetails(reason);

  showPanicDialog(details);
} // end onUnhandledRejection

function showPanicDialog(text) {
  if (panicShown) return;
  panicShown = true;

  const overlay = document.createElement("div");
  overlay.id = "panicOverlay";

  const panel = document.createElement("div");
  panel.className = "panic-panel";

  const title = document.createElement("div");
  title.className = "panic-title";
  title.textContent = "FATAL ERROR (UNPLANNED)";

  const hint = document.createElement("div");
  hint.className = "panic-hint";
  hint.textContent = "Copy the text below. The app is now in a broken state.";

  const ta = document.createElement("textarea");
  ta.className = "panic-textarea";
  ta.value = text;
  ta.readOnly = true;
  ta.spellcheck = false;

  const buttons = document.createElement("div");
  buttons.className = "panic-buttons";

  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy";
  copyBtn.onclick = () => {
    ta.select();
    document.execCommand("copy");
  };

  const dismissBtn = document.createElement("button");
  dismissBtn.textContent = "Dismiss (Not Recommended)";
  dismissBtn.onclick = () => overlay.remove();

  buttons.appendChild(copyBtn);
  buttons.appendChild(dismissBtn);

  panel.appendChild(title);
  panel.appendChild(hint);
  panel.appendChild(ta);
  panel.appendChild(buttons);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  ta.focus();
  ta.select();
} // end showPanicDialog

function formatWindowErrorDetails(ev, err) {
  const parts = [];

  parts.push("TYPE: window.error");
  parts.push("MESSAGE: " + (ev.message || "(none)"));

  if (ev.filename) parts.push("FILE: " + ev.filename);
  if (ev.lineno != null) parts.push("LINE: " + ev.lineno);
  if (ev.colno != null) parts.push("COL: " + ev.colno);

  parts.push("");
  parts.push("ERROR:");
  parts.push(err && err.stack ? err.stack : String(err));

  return parts.join("\n");
} // end formatWindowErrorDetails

function formatUnhandledRejectionDetails(reason) {
  const parts = [];

  parts.push("TYPE: unhandledrejection");
  parts.push("");

  if (reason && reason.stack) {
    parts.push(reason.stack);
  } else {
    parts.push(String(reason));
  }

  return parts.join("\n");
} // end formatUnhandledRejectionDetails

/* ui/logging.js
   ------------------------------------------------------------
   checkStructure()
   Fail-fast structural assertions for invariant DOM + canvas ctx.

   Design:
     - NO REPAIR. Any failure throws immediately.
     - No hard-coded IDs in this file.
       Caller supplies the required IDs (so we do not invent selectors).
     - Intended usage: call once, early, from setUI.js.

   ------------------------------------------------------------
   OPTIONAL DEBUG LOG OVERLAY (lazy init)
   ------------------------------------------------------------
   This is appended below. It is NOT activated unless you either:

     A) import { log, logObj } from "./logging.js" and call them, OR
     B) call installLoggingGlobals() once at startup, then use:
          window.log(...)
          window.logObj(...)

   The overlay is created on FIRST log call.
   For objects, the overlay prints a breadcrumb and the object is
   sent to console.log so it can be expanded.
   ------------------------------------------------------------ */

/* ============================================================
   checkStructure(spec)
============================================================ */
export function checkStructure(spec) {
  if (!spec) throw new Error("checkStructure: spec is required");
  if (!spec.requiredIds) throw new Error("checkStructure: spec.requiredIds is required");
  if (!Array.isArray(spec.requiredIds)) throw new Error("checkStructure: spec.requiredIds must be an array");

  // Required invariant DOM nodes (by id)
  for (let i = 0; i < spec.requiredIds.length; i++) {
    const id = spec.requiredIds[i];
    if (!id) throw new Error("checkStructure: requiredIds contains an empty id");

    const el = document.getElementById(id);
    if (!el) throw new Error("checkStructure: missing required element #" + id);
  }

  // Optional: verify a specific canvas exists (by id)
  if (spec.canvasId) {
    const canvas = document.getElementById(spec.canvasId);
    if (!canvas) throw new Error("checkStructure: missing required canvas #" + spec.canvasId);
    if (canvas.tagName !== "CANVAS") {
      throw new Error("checkStructure: #" + spec.canvasId + "exists but is not a CANVAS");
    }
  }

  // Optional: verify a 2D ctx is available via the global getter you already use
  // (This does NOT declare or pass a ctx variable; it only validates it.)
  if (spec.requireCtx === true) {
    const c = window.ctx;
    if (!c) throw new Error("checkStructure: window.ctx is null (ctx getter returned null)");
    if (!c.canvas) throw new Error("checkStructure: window.ctx exists but has no .canvas (not a 2D context)");
    if (typeof c.beginPath !== "function") {
      throw new Error("checkStructure: window.ctx exists but does not look like a CanvasRenderingContext2D");
    }
  }

  // Optional: verify required globals (names only). Example: ["uiState", "overlayManager"]
  if (spec.requiredGlobals) {
    if (!Array.isArray(spec.requiredGlobals)) {
      throw new Error("checkStructure: spec.requiredGlobals must be an array");
    }

    for (let j = 0; j < spec.requiredGlobals.length; j++) {
      const name = spec.requiredGlobals[j];
      if (!name) throw new Error("checkStructure: requiredGlobals contains an empty name");
      if (!(name in window)) throw new Error("checkStructure: missing required global window." + name);
    }
  }
} // end checkStructure


/* ============================================================
   OPTIONAL DEBUG LOG OVERLAY (lazy init)
============================================================ */

let debugLogOverlay = null;
let debugLogBody = null;


/* ------------------------------------------------------------
   installLoggingGlobals()
   Optional: installs window.log/window.logObj/etc.
------------------------------------------------------------ */
export function installLoggingGlobals() {
  window.log = log;
  window.logObj = logObj;
  window.logClear = clearLog;
  window.logShow = showLog;
  window.logHide = hideLog;
} // end installLoggingGlobals


/* ------------------------------------------------------------
   log(msg, ...args)
   Creates overlay on first use and appends a line.
------------------------------------------------------------ */
export function log(msg, ...args) {
  ensureDebugLogOverlay();

  const line = formatLine("LOG", msg, args);
  appendLine(line);

  // Mirror to console for convenience.
  // For objects, prefer logObj() so the overlay stays readable.
  if (args.length === 0) {
    console.log(msg);
  } else {
    console.log(msg, ...args);
  }
} // end log


/* ------------------------------------------------------------
   logObj(label, obj)
   Overlay breadcrumb + console expandable object.
------------------------------------------------------------ */
export function logObj(label, obj) {
  ensureDebugLogOverlay();

  const safeLabel = label ? String(label) : "(no label)";
  const line = timestamp() + " TRACED OBJECT: " + safeLabel + " (see console)";
  appendLine(line);

  console.log("TRACED OBJECT:", safeLabel, obj);
} // end logObj


/* ------------------------------------------------------------
   clearLog()
------------------------------------------------------------ */
export function clearLog() {
  if (!debugLogBody) return;
  debugLogBody.textContent = "";
} // end clearLog


/* ------------------------------------------------------------
   showLog()
------------------------------------------------------------ */
export function showLog() {
  if (!debugLogOverlay) return;
  debugLogOverlay.style.display = "block";
} // end showLog


/* ------------------------------------------------------------
   hideLog()
------------------------------------------------------------ */
export function hideLog() {
  if (!debugLogOverlay) return;
  debugLogOverlay.style.display = "none";
} // end hideLog


/* ============================================================
   INTERNALS (overlay creation + formatting)
============================================================ */

function ensureDebugLogOverlay() {
  if (debugLogOverlay) return;

  if (!document.body) throw new Error("logging: document.body is missing");

  debugLogOverlay = document.createElement("div");
  debugLogOverlay.id = "debugLogOverlay";

  const panel = document.createElement("div");
  panel.className = "debuglog-panel";

  const header = document.createElement("div");
  header.className = "debuglog-header";

  const title = document.createElement("div");
  title.className = "debuglog-title";
  title.textContent = "Debug Log";

  const controls = document.createElement("div");
  controls.className = "debuglog-controls";

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.textContent = "Clear";
  clearBtn.onclick = () => clearLog();

  const hideBtn = document.createElement("button");
  hideBtn.type = "button";
  hideBtn.textContent = "Hide";
  hideBtn.onclick = () => hideLog();

  controls.appendChild(clearBtn);
  controls.appendChild(hideBtn);

  header.appendChild(title);
  header.appendChild(controls);

  debugLogBody = document.createElement("div");
  debugLogBody.className = "debuglog-body";

  panel.appendChild(header);
  panel.appendChild(debugLogBody);

  debugLogOverlay.appendChild(panel);
  document.body.appendChild(debugLogOverlay);
} // end ensureDebugLogOverlay


function appendLine(text) {
  const line = document.createElement("div");
  line.className = "debuglog-line";
  line.textContent = text;

  debugLogBody.appendChild(line);
  debugLogBody.scrollTop = debugLogBody.scrollHeight;
} // end appendLine


function formatLine(level, msg, args) {
  const base = msg ? String(msg) : "";
  const extra = args && args.length ? " " + args.map(stringifyArg).join(" ") : "";
  return timestamp() + " " + level + ": " + base + extra;
} // end formatLine


function stringifyArg(a) {
  if (a === null) return "null";
  if (a === undefined) return "undefined";

  const t = typeof a;
  if (t === "string") return a;
  if (t === "number" || t === "boolean") return String(a);

  try {
    if (Array.isArray(a)) return "[Array len=" + a.length + "]";
    if (t === "function") return "[Function " + (a.name || "anonymous") + "]";
    return "[Object " + objectKeyCount(a) + " keys]";
  } catch (e) {
    return "[Unstringifiable]";
  }
} // end stringifyArg


function objectKeyCount(o) {
  return Object.keys(o).length;
} // end objectKeyCount


function timestamp() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return hh + ":" + mm + ":" + ss + "." + ms;
} // end timestamp
