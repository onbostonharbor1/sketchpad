/* ------------------------------------------------------------
   openOffcanvas(item)
   - Populates and displays the Bootstrap offcanvas.
   - Delegates actual content population to renderOffcanvasContent().
------------------------------------------------------------ */
function openOffcanvas(item) {
  const offcanvasEl = document.getElementById("offcanvasPanel");
  if (!offcanvasEl) return;

  const bsCanvas = new bootstrap.Offcanvas(offcanvasEl);
  bsCanvas.show();

  renderOffcanvasContent(item);
} // end openOffcanvas

/* ------------------------------------------------------------
   renderOffcanvasContent(item)
   Extended to support script mode.
   If item.mode === "script", render script text only.
------------------------------------------------------------ */
function renderOffcanvasContent(item) {

  const body = document.querySelector("#offcanvasPanel .offcanvas-body");
  if (!body) return;

  body.innerHTML = "";

  // SCRIPT MODE
  if (item && item.mode === "script") {
    const pre = document.createElement("pre");
    pre.style.whiteSpace = "pre-wrap";
    pre.style.fontSize = "0.85rem";
    pre.textContent = item.scriptText;
    body.appendChild(pre);
    return;  // TERMINATE EARLY
  }

  // -----------------------------------------------
  // DEFAULT MODE (unchanged)
  // -----------------------------------------------
  const heading = document.createElement("h5");
  heading.textContent = `Options for ${item.name}`;
  body.appendChild(heading);

  const related = [
    { name: `${item.name} – Variant A` },
    { name: `${item.name} – Variant B` },
    { name: `${item.name} – Variant C` }
  ];

  related.forEach(obj => {
    const btn = document.createElement("button");
    btn.className = "btn btn-outline-primary w-100 mb-2";
    btn.textContent = obj.name;
    btn.onclick = () => alert(`Load ${obj.name}`);
    body.appendChild(btn);
  });
} // end renderOffcanvasContent


/* ------------------------------------------------------------
   showScriptOffcanvas(scriptPath, titleText)
   Fetches script source and displays it inside the Bootstrap
   offcanvas panel. Offcanvas is appropriate for long, scrollable
   text that should not block the app.
------------------------------------------------------------ */
/* ------------------------------------------------------------
   showScriptOffcanvas(scriptPath, titleText)
   Fetches the script source and displays it in the offcanvas.
------------------------------------------------------------ */
export function showScriptOffcanvas(scriptPath, titleText) {

  fetch(scriptPath)
    .then(resp => resp.text())
    .then(text => {

      const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      const panel = document.getElementById("offcanvasPanel");
      if (!panel)
        throw new Error("showScriptOffcanvas: offcanvasPanel not found");

      const body = panel.querySelector(".offcanvas-body");
      if (!body)
        throw new Error("showScriptOffcanvas: .offcanvas-body missing");

      const titleEl = panel.querySelector(".offcanvas-title");
      if (titleEl)
        titleEl.textContent = titleText + " Script";

      body.innerHTML = "";

      const pre = document.createElement("pre");
      pre.style.whiteSpace = "pre-wrap";
      pre.style.fontSize = "0.85rem";
      pre.textContent = escaped;

      body.appendChild(pre);

      const bsCanvas = new bootstrap.Offcanvas(panel);
      bsCanvas.show();
    });
} // end showScriptOffcanvas

