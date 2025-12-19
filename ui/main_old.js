/* main.js – Orchestration and setup only */

const categoryFieldset = document.getElementById("categoryFieldset");
const itemFieldset = document.getElementById("itemFieldset");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const controlFieldset = document.getElementById("controlFieldset");

function initCanvas() {
  if (!canvas || !ctx) {
    alert("Canvas failed to initialize.");
    return;
  }
  clearCanvas();
} // end initCanvas

function clearCanvas(bg = "#ffffff") {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
} // end clearCanvas

function setupCategoryFieldset() {
  const fieldset = document.getElementById("categoryFieldset");
  fieldset.innerHTML = "<legend>Select Category</legend>";

  fetch("patterns/directoryRegistry.json")
    .then((r) => r.json())
    .then((categories) => {
      categories.forEach((category) => {
        const label = document.createElement("label");
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "category";
        radio.value = category;

        label.appendChild(radio);
        label.append(` ${capitalize(category)}`);
        fieldset.appendChild(label);
      });
    })
    .catch((err) => console.error("Failed to load categories:", err));
} // end setupCategoryFieldset

function setupCategoryListener() {
  categoryFieldset.addEventListener("change", (e) => {
    const category = e.target.value;
    gl.currentCategory = category;
    renderManifestButtons(category); // now from patterns.js

    const firstBtn = itemFieldset.querySelector("button");
    if (firstBtn) firstBtn.classList.add("selected");
  });
} // end setupCategoryListener

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
} // end capitalize

function setupTabs() {
  const tabs = document.querySelectorAll("#tabs button");

  function clearActiveStates() {
    tabs.forEach((tab) => tab.classList.remove("active"));
  } // end clearActiveStates

  function resetPanels() {
    categoryFieldset.style.display = "none";
    itemFieldset.style.display = "none";
    itemFieldset.innerHTML = "<legend>Select Item</legend>";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const image = document.getElementById("image");
    image.style.display = "none";
    image.src = "";
  } // end resetPanels

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      clearActiveStates();
      tab.classList.add("active");
      resetPanels();

      const mode = tab.dataset.mode;
      gl.currentMode = mode;

      if (mode === "patterns") {
        categoryFieldset.style.display = "block";
        setupCategoryFieldset();
        canvas.style.display = "block";
        document.getElementById("image").style.display = "none";
      } else if (mode === "gallery") {
        categoryFieldset.style.display = "block";
        setupGalleryFieldset();
        canvas.style.display = "none";
        const image = document.getElementById("image");
        image.style.display = "block";
        image.src = "";
      } else if (mode === "draw") {
        categoryFieldset.style.display = "block";
        renderDrawObjects(); // from drawRegistry
        canvas.style.display = "block";
        document.getElementById("image").style.display = "none";
      }
    });
  });
} // end setupTabs

function loadMagicIfExists() {
  const script = document.createElement("script");
  script.src = "./patterns/magic.js";
  script.onerror = () => {};
  document.head.appendChild(script);
} // end loadMagicIfExists

window.onload = () => {
  initCanvas();
  setupTabs();
  setupCategoryListener();
  injectOverlayIfNeeded();
  const radios = categoryFieldset.querySelectorAll('input[type="radio"]');
  radios.forEach((r) => (r.checked = false));
  loadMagicIfExists();
}; // end window.onload
