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
   - Injects content into the offcanvas for a given item.
   - Demonstrates a simple placeholder for now.
------------------------------------------------------------ */
function renderOffcanvasContent(item) {

  const body = document.querySelector("#offcanvasPanel .offcanvas-body");

  if (!body) return;

  body.innerHTML = "";

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
