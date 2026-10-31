/* ===========================================================
   scriptView.js
   -----------------------------------------------------------
   showScriptOffcanvas(): show a script's source text in the offcanvas panel.
   =========================================================== */

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
