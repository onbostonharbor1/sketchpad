/* ===========================================================
   background.js – Lab script (runPattern version)
   -----------------------------------------------------------
   Three controls:
     • colorText   (text)
     • colorPicker (color input)
     • showGrid    (checkbox)
   Draws onto the shared canvas.
=========================================================== */
export function runPattern() {
  const params = {
    colorText: "",
    colorPicker: "#add8e6",
    showGrid: false
  };

  // ---------------------------------------------------------
  // CLEAR UI PANELS
  // ---------------------------------------------------------
  const action = document.getElementById("action");
  const textDiv = document.getElementById("text");

  if (!action || !textDiv)
    throw new Error("background.js: missing #action or #text");

  action.innerHTML = "";
  textDiv.innerHTML = "";    // Lab scripts do not use text output normally

  // ---------------------------------------------------------
  // CONTROL 1 — Color (text)
  // ---------------------------------------------------------
  const row1 = document.createElement("div");
  row1.className = "ctrl-field";

  const label1 = document.createElement("label");
  label1.textContent = "Color:";

  const input1 = document.createElement("input");
  input1.type = "text";
  input1.className = "ctrl-text";
  input1.value = params.colorText;

  input1.addEventListener("input", () => {
    params.colorText = input1.value;
    drawBackground(params);
  });

  row1.appendChild(label1);
  row1.appendChild(input1);
  action.appendChild(row1);

  // ---------------------------------------------------------
  // CONTROL 2 — Color Picker
  // ---------------------------------------------------------
  const row2 = document.createElement("div");
  row2.className = "ctrl-field";

  const label2 = document.createElement("label");
  label2.textContent = "Picker:";

  const input2 = document.createElement("input");
  input2.type = "color";
  input2.value = params.colorPicker;

  input2.addEventListener("input", () => {
    params.colorPicker = input2.value;
    drawBackground(params);
  });

  row2.appendChild(label2);
  row2.appendChild(input2);
  action.appendChild(row2);

  // ---------------------------------------------------------
  // CONTROL 3 — Show Grid checkbox
  // ---------------------------------------------------------
  const row3 = document.createElement("div");
  row3.className = "ctrl-field";

  const label3 = document.createElement("label");
  label3.textContent = "Show Grid:";

  const input3 = document.createElement("input");
  input3.type = "checkbox";
  input3.checked = params.showGrid;

  input3.addEventListener("input", () => {
    params.showGrid = input3.checked;
    drawBackground(params);
  });

  row3.appendChild(label3);
  row3.appendChild(input3);
  action.appendChild(row3);

  // ---------------------------------------------------------
  // INITIAL DRAW
  // ---------------------------------------------------------
  drawBackground(params);

  return null;
} // end runPattern


/* ===========================================================
   drawBackground(params)
   Draws directly on sharedCanvas using ctx and your wrappers.
=========================================================== */
function drawBackground(params) {
  const canvas = document.getElementById("sharedCanvas");
  const width = canvas.width;
  const height = canvas.height;

  // choose typed text color first, fallback to picker
  const typed = (params.colorText || "").trim();
  const color = typed !== "" ? typed : params.colorPicker;
  const grid = params.showGrid;

  ctx.save();

  ctx.fillStyle = color;
  ctx.strokeStyle = "PapayaWhip";
  ctx.lineWidth = 1;

  ctx.fillRect(0, 0, width, height);

  // ---------------------------------------------------------
  // GRID
  // ---------------------------------------------------------
  if (grid) {
    let x = 25;
    while (x < width) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.closePath();
      x += 25;
    }

    let y = 25;
    while (y < height) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.closePath();
      y += 25;
    }
  }

  ctx.restore();
} // end drawBackground
