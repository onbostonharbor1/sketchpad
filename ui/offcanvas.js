/* ===========================================================
   offcanvas.js
   -----------------------------------------------------------
   Shows the permanent offcanvas panel (#offcanvasPanel) with a title and a body, and
   hides it again: hideOffcanvas(). It closes on the X button, a click on the dimmed
   backdrop, or the Escape key. The look comes from css/base.css and css/offcanvas.css.
   =========================================================== */

/* ============================================================
   showOffcanvas({ title, buildBody?, bodyHtml? })
   ============================================================
   Unified offcanvas display function. Accepts either:

     buildBody (function) — called with the body element,
       used when the caller needs to wire event handlers after
       inserting HTML (Commands panels).

     bodyHtml (string) — injected directly as innerHTML,
       used for simple content display (thumbnails, scripts).

   Exactly one of buildBody or bodyHtml must be provided.
   ============================================================ */
export function showOffcanvas({ title, buildBody, bodyHtml }) {

  const panel = document.getElementById("offcanvasPanel");
  if (!panel) throw new Error("showOffcanvas: #offcanvasPanel not found");

  const titleEl = panel.querySelector(".offcanvas-title");
  if (!titleEl) throw new Error("showOffcanvas: .offcanvas-title not found");

  const bodyEl = panel.querySelector(".offcanvas-body");
  if (!bodyEl) throw new Error("showOffcanvas: .offcanvas-body not found");

  if (!buildBody && !bodyHtml && bodyHtml !== "") {
    throw new Error("showOffcanvas: either buildBody or bodyHtml is required");
  }

  titleEl.textContent = title || "";
  bodyEl.innerHTML = "";

  if (typeof buildBody === "function") {
    buildBody(bodyEl);
  } else {
    bodyEl.innerHTML = bodyHtml || "";
  }

  showPanel();

} // end showOffcanvas


/* ============================================================
   Opening and closing the panel
   ============================================================ */
const PANEL_ID = "offcanvasPanel";
const SLIDE_MS = 300;              // matches the CSS transition on .offcanvas
let backdropEl = null;

// Show #offcanvasPanel as it stands (a caller that filled it in itself uses this).
export function showPanel() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) throw new Error("showPanel: #offcanvasPanel not found");
  if (panel.classList.contains("show")) return;

  // Dimmed backdrop behind the panel; a click on it closes the panel.
  backdropEl = document.createElement("div");
  backdropEl.className = "offcanvas-backdrop fade";
  backdropEl.addEventListener("click", hideOffcanvas);
  document.body.appendChild(backdropEl);

  document.body.style.overflow = "hidden";    // no page scrolling behind the panel
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.classList.remove("hiding");

  // Force a layout so the browser starts from the hidden position and slides in.
  void panel.offsetWidth;
  panel.classList.add("show");
  backdropEl.classList.add("show");
  panel.focus();

  const closeBtn = panel.querySelector(".btn-close");
  if (closeBtn) closeBtn.onclick = hideOffcanvas;
  document.addEventListener("keydown", onEscape);
}

function onEscape(evt) {
  if (evt.key === "Escape") hideOffcanvas();
}

export function hideOffcanvas() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel || !panel.classList.contains("show")) return;

  document.removeEventListener("keydown", onEscape);
  panel.classList.add("hiding");        // stays visible while it slides out
  panel.classList.remove("show");
  panel.removeAttribute("aria-modal");
  panel.removeAttribute("role");

  const backdrop = backdropEl;
  backdropEl = null;
  if (backdrop) backdrop.classList.remove("show");

  setTimeout(() => {
    panel.classList.remove("hiding");
    if (backdrop) backdrop.remove();
    if (!document.querySelector(".offcanvas.show")) document.body.style.overflow = "";
  }, SLIDE_MS);
} // end hideOffcanvas
