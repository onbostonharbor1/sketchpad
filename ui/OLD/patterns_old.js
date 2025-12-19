/* patterns.js
   Handles Patterns tab: category selection, manifest loading,
   and script execution within ./patterns/ hierarchy.
*/

function renderManifestButtons(category) {
  loadManifest(category).then((fileList) => {
    if (!Array.isArray(fileList) || fileList.length === 0) {
      console.warn(`renderManifestButtons: no entries found for "${category}"`);
      return;
    }

    itemFieldset.innerHTML = `
      <legend>Select ${category}</legend>
      <div id="thumbnailGrid" class="grid"></div>
    `;
    const grid = itemFieldset.querySelector("#thumbnailGrid");
    itemFieldset.style.display = "block";

    if (fileList.length > 36) grid.classList.add("scrollable");

    fileList.forEach(({ filename, path }, index) => {
      const thumbPath = `./patterns/${category}/images/thumb_${filename}.png`;

      const wrapper = document.createElement("div");
      wrapper.className = "thumbWrapper";

      const img = document.createElement("img");
      img.src = thumbPath;
      img.alt = filename;
      img.onerror = () => {
        console.warn(`Missing thumbnail for ${filename}, using fallback.`);
        img.src = "./patterns/thumb.png";
      };

      wrapper.appendChild(img);
      grid.appendChild(wrapper);

      wrapper.onclick = () => {
        grid.querySelectorAll(".thumbWrapper").forEach((w) =>
          w.classList.remove("selected")
        );
        wrapper.classList.add("selected");

        gl.currentCategory = category;
        gl.currentFilename = filename;
        gl.currentTitle = "";

        loadScriptFromPath(path);
        refreshOverlayTitle();
      };

      if (index === 0) wrapper.click();
    });
  });
} // end renderManifestButtons

async function loadManifest(category) {
  const registryPath = "./patterns/directoryRegistry.json";
  const manifestPath = `./patterns/${category}/manifest.json`;

  try {
    const registryRes = await fetch(registryPath);
    if (!registryRes.ok) throw new Error("Failed to load directory registry");
    const registry = await registryRes.json();
    if (!registry.includes(category)) {
      console.warn(`loadManifest: category "${category}" not found`);
      return [];
    }

    const manifestRes = await fetch(manifestPath);
    if (!manifestRes.ok)
      throw new Error(`Failed to load manifest for ${category}`);
    const manifest = await manifestRes.json();

    if (!Array.isArray(manifest)) {
      console.warn(`loadManifest: manifest for "${category}" not array`);
      return [];
    }

    return manifest.filter(
      (entry) =>
        typeof entry.filename === "string" && typeof entry.path === "string"
    );
  } catch (err) {
    console.warn("loadManifest: unexpected error", err);
    return [];
  }
} // end loadManifest

function loadScript(category, filename) {
  if (!canvas || !ctx) {
    alert("Canvas not ready yet.");
    return;
  }

  gl.currentCategory = category;
  gl.currentFilename = filename;
  clearCanvas();

  const oldScript = document.getElementById("dynamicScript");
  if (oldScript) oldScript.remove();

  const script = document.createElement("script");
  script.src = `./patterns/${category}/${filename}.js?t=${Date.now()}`;
  script.id = "dynamicScript";
  script.onerror = () => {
    ctx.fillStyle = "#eee";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "black";
    ctx.fillText(`Failed to load ${filename}`, 10, 30);
  };

  document.body.appendChild(script);
} // end loadScript

function loadScriptFromPath(path) {
  if (!canvas || !ctx) {
    alert("Canvas not ready yet.");
    return;
  }
  clearCanvas();

  const oldScript = document.getElementById("dynamicScript");
  if (oldScript) oldScript.remove();

  const script = document.createElement("script");
  script.src = `patterns/${path}?t=${Date.now()}`;
  script.id = "dynamicScript";

  script.onerror = () => {
    ctx.fillStyle = "#eee";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "black";
    ctx.fillText(`Failed to load ${path}`, 10, 30);
  };

  gl.currentTitle = "";
  refreshOverlayTitle();
  script.onload = () => refreshOverlayTitle();

  document.body.appendChild(script);
} // end loadScriptFromPath
