/* ui/ui_draw.js
   ------------------------------------------------------------
   Activates Draw tab: builds object list from drawRegistry,
   creates a shared canvas, and manages parameter controls.
   ------------------------------------------------------------ */

let drawCtx = null;
let drawCanvas = null;

/* ------------------------------------------------------------
   Initialization: called when Draw tab is shown
------------------------------------------------------------ */

/* ------------------------------------------------------------
   Activate and draw selected object
------------------------------------------------------------ */
function activateDrawObject(entry, key) {
  clearDrawCanvas();

  const thing = entry.create();
  entry.draw(thing);

  uiState.currentDraw = key;
  uiState.currentThing = thing;

  buildDrawControls(entry, thing);
} // end activateDrawObject


/* ------------------------------------------------------------
   Build UI controls dynamically (left sidebar)
------------------------------------------------------------ */
function buildDrawControls(entry, thing) {
  const controlArea = document.getElementById("drawControl");
  if (!controlArea) return;

  // Remove existing controls but keep the object list header
  const existingLists = controlArea.querySelectorAll("ul");
  existingLists.forEach((ul) => ul.remove());

  const legend = document.createElement("h6");
  legend.className = "mt-3";
  legend.textContent = "Object Controls";
  controlArea.appendChild(legend);

  Object.entries(entry.controls).forEach(([param, spec]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "controlWrapper";

    const label = document.createElement("label");
    label.textContent = spec.label;
    wrapper.appendChild(label);

    let input;
    if (spec.widget === "slider") {
      input = document.createElement("input");
      input.type = "range";
      input.min = spec.min;
      input.max = spec.max;
      input.step = spec.step;
      input.value = thing[param];
      input.oninput = () => {
        thing[param] = parseFloat(input.value);
        redrawCurrent(entry, thing);
      };
    } else if (spec.widget === "colorPicker") {
      input = document.createElement("input");
      input.type = "color";
      input.value = thing[param];
      input.oninput = () => {
        thing[param] = input.value;
        redrawCurrent(entry, thing);
      };
    } else if (spec.widget === "pointPicker") {
      input = document.createElement("button");
      input.textContent = "Pick Point";
      input.onclick = () => alert("Point picking not yet implemented");
    }

    wrapper.appendChild(input);
    controlArea.appendChild(wrapper);
  });
} // end buildDrawControls


/* ------------------------------------------------------------
   Redraw helpers
------------------------------------------------------------ */
function redrawCurrent(entry, thing) {
  clearDrawCanvas();
  entry.draw(thing);
}

function clearDrawCanvas(bg = "#ffffff") {
  if (!drawCtx) return;
  drawCtx.fillStyle = bg;
  drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
}


  // show categories pane
  const catPane = document.getElementById('draw-categories');
  if (catPane) catPane.style.display = 'block';

  // ensure grid is visible and populated
  const grid = document.getElementById('drawGrid');
  if (grid) {
    grid.style.display = 'block';
    if (grid.children.length === 0) renderDrawObjects();
  }

function initDrawTab() {
  console.log("Initializing Draw tab…");

  // Populate the grid on startup
  renderDrawObjects();

  // Hook up the Categories button to always restore the grid
  const catBtn = document.querySelector('#drawSubtabBar [data-target="categories"]');
  if (!catBtn) {
    console.warn("initDrawTab: categories button not found");
    return;
  }

  catBtn.addEventListener("click", () => {
    console.log("Categories button clicked — showing grid");
    setDrawView("categories");
  });
} // end initDrawTab
