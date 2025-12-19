/* gallery.js
   Handles Gallery tab: categories, thumbnails, and image loading
   from ./Gallery hierarchy.
*/

async function setupGalleryFieldset() {
  const fieldset = document.getElementById("categoryFieldset");
  fieldset.innerHTML = "<legend>Select Gallery Category</legend>";

  try {
    const response = await fetch("Gallery/directoryRegistry.json");
    if (!response.ok) throw new Error("Failed to load gallery registry");
    const categories = await response.json();

    categories.forEach((category) => {
      const label = document.createElement("label");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "galleryCategory";
      radio.value = category;

      radio.addEventListener("change", () => {
        renderGalleryButtons(category);
      });

      label.appendChild(radio);
      label.append(` ${capitalize(category)}`);
      fieldset.appendChild(label);
    });
  } catch (err) {
    console.error("setupGalleryFieldset error:", err);
  }
} // end setupGalleryFieldset

async function renderGalleryButtons(category) {
  const manifestPath = `Gallery/${category}/manifest.json`;

  try {
    const response = await fetch(manifestPath);
    if (!response.ok) throw new Error(`Failed to load manifest for ${category}`);
    const manifest = await response.json();
    if (!Array.isArray(manifest)) {
      console.warn(`Manifest for ${category} is not an array`);
      return;
    }

    itemFieldset.innerHTML = `<legend>Select ${category}</legend>`;
    const grid = document.createElement("div");
    grid.id = "thumbnailGrid";
    grid.className = "grid";
    itemFieldset.appendChild(grid);
    itemFieldset.style.display = "block";

    manifest.forEach(({ filename, path }, index) => {
      const thumbPath = `Gallery/${category}/thumb_${filename}.png`;

      const wrapper = document.createElement("div");
      wrapper.className = "thumbWrapper";

      const img = document.createElement("img");
      img.src = thumbPath;
      img.alt = filename;
      img.onerror = () => {
        console.warn(`Missing thumbnail for ${filename}, using fallback`);
        img.src = "Gallery/thumb.png";
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

        loadImageFromPath(path);
        refreshOverlayTitle();
      };

      if (index === 0) wrapper.click();
    });
  } catch (err) {
    console.error("renderGalleryButtons error:", err);
  }
} // end renderGalleryButtons

function loadImageFromPath(path) {
  const canvas = document.getElementById("canvas");
  const image = document.getElementById("image");

  canvas.style.display = "none";
  image.style.display = "block";

  gl.currentTitle = "";
  refreshOverlayTitle();

  image.onload = () => {
    const viewer = document.getElementById("viewer");
    const viewerWidth = viewer.clientWidth;
    const viewerHeight = viewer.clientHeight;

    image.style.width = "auto";
    image.style.height = "auto";

    if (image.naturalWidth > viewerWidth || image.naturalHeight > viewerHeight) {
      image.style.maxWidth = "100%";
      image.style.maxHeight = "100%";
    } else {
      image.style.maxWidth = "none";
      image.style.maxHeight = "none";
    }
  };

  image.src = `Gallery/${path}?t=${Date.now()}`;
  image.alt = path;
} // end loadImageFromPath
