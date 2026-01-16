/* ui/nextPrevOverlay.js
   ------------------------------------------------------------
   Next/Prev Click-Zone Overlay (Region Overlay, NOT overlayManager)
   ------------------------------------------------------------
   Purpose:
     Provide an alternate navigation input surface for any tab
     that already has Prev/Next logic.

   Behavior:
     - A transparent overlay sits on top of a target region.
     - Left 25% click zone triggers onPrev.
     - Right 25% click zone triggers onNext.
     - Faint chevrons appear in each zone.
     - Middle 50% is inert (does not capture clicks).

   Requirements:
     - index.html must include:  <div id="overlay-nextprev"></div>
     - CSS must position overlay correctly (absolute within a
       position:relative target container).
*/

const OVERLAY_ID = "overlay-nextprev";

let overlayEl     = null;
let leftZoneEl    = null;
let rightZoneEl   = null;

let currentTarget = null;
let currentOnPrev = null;
let currentOnNext = null;

/* ============================================================
   ensureOverlayElement()
============================================================ */
function ensureOverlayElement() {

  if (overlayEl) return;

  overlayEl = document.getElementById(OVERLAY_ID);
  if (!overlayEl) {
    throw new Error("nextPrevOverlay: #" + OVERLAY_ID + " not found (index.html missing it)");
  }

  overlayEl.innerHTML = "";
  overlayEl.style.display = "none";

  // Build hit zones once; we only move the overlay around.
  const left  = document.createElement("div");
  const right = document.createElement("div");

  left.className  = "nextprev-zone nextprev-zone-left";
  right.className = "nextprev-zone nextprev-zone-right";

  // Icons (simple default; can be swapped later).
  const leftIcon = document.createElement("div");
  leftIcon.className = "nextprev-icon nextprev-icon-left";
  leftIcon.textContent = "‹";

  const rightIcon = document.createElement("div");
  rightIcon.className = "nextprev-icon nextprev-icon-right";
  rightIcon.textContent = "›";

  left.appendChild(leftIcon);
  right.appendChild(rightIcon);

  overlayEl.appendChild(left);
  overlayEl.appendChild(right);

  leftZoneEl  = left;
  rightZoneEl = right;

  leftZoneEl.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    if (!currentOnPrev) return;
    currentOnPrev();
  });

  rightZoneEl.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    if (!currentOnNext) return;
    currentOnNext();
  });

} // end ensureOverlayElement

/* ============================================================
   enableNextPrevOverlay(spec)
   ------------------------------------------------------------
   Args:
     spec = {
       targetEl: <HTMLElement>,
       onPrev: <function>,
       onNext: <function>
     }
============================================================ */
export function enableNextPrevOverlay(spec) {

  if (!spec) throw new Error("enableNextPrevOverlay: spec missing");
  if (!spec.targetEl) throw new Error("enableNextPrevOverlay: targetEl missing");
  if (typeof spec.onPrev !== "function") throw new Error("enableNextPrevOverlay: onPrev must be a function");
  if (typeof spec.onNext !== "function") throw new Error("enableNextPrevOverlay: onNext must be a function");

  ensureOverlayElement();

  // Always ensure the overlay is actually attached to the target.
  // NOTE: target innerHTML="" can delete the overlay; in that case
  // parentElement will not be the target, even if currentTarget
  // still points there.
  if (overlayEl.parentElement !== spec.targetEl) {
    spec.targetEl.appendChild(overlayEl);
    currentTarget = spec.targetEl;
  }

  currentOnPrev = spec.onPrev;
  currentOnNext = spec.onNext;

  overlayEl.style.display = "block";

} // end enableNextPrevOverlay



/* ============================================================
   disableNextPrevOverlay()
============================================================ */
export function disableNextPrevOverlay() {

  ensureOverlayElement();

  overlayEl.style.display = "none";

  currentOnPrev = null;
  currentOnNext = null;
  currentTarget = null;

} // end disableNextPrevOverlay

/* ============================================================
   disableAllNextPrevOverlays()
   ------------------------------------------------------------
   Exists for API symmetry and future expansion.
============================================================ */
export function disableAllNextPrevOverlays() {
  disableNextPrevOverlay();
} // end disableAllNextPrevOverlays
