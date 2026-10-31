/* ===========================================================
   offcanvas.js
   -----------------------------------------------------------
   Shows the permanent offcanvas panel (#offcanvasPanel) with a title and a body.
   =========================================================== */

/*************************************************************
   showCommandsOffcanvas({ title, buildBody })
   -----------------------------------------------------------
   Uses the permanent offcanvas shell (#offcanvasPanel).
   Dynamically populates the body and shows it.
*************************************************************/
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

  if (!window.bootstrap || !window.bootstrap.Offcanvas) {
    throw new Error("showOffcanvas: Bootstrap Offcanvas not available on window.bootstrap");
  }

  const oc = window.bootstrap.Offcanvas.getOrCreateInstance(panel);
  oc.show();

} // end showOffcanvas


/* ============================================================
   Backward-compatibility aliases
   ============================================================
   showCommandsOffcanvas and showOffcanvasPanel both delegate
   to showOffcanvas. Callers can migrate at their own pace.
   ============================================================ */
export function showCommandsOffcanvas({ title, buildBody }) {
  return showOffcanvas({ title, buildBody });
}

export function showOffcanvasPanel({ title, bodyHtml }) {
  return showOffcanvas({ title, bodyHtml });
}
