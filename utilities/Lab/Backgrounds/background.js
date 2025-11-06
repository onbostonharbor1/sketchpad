/* ===========================================================
   background.js – Lab script with 3 parameter controls
   colorText (text/hex), colorPicker (input type=color), showGrid (checkbox)
=========================================================== */
function background() {
  const sourceInfo = {
    parameters: {
      colorText: "", // empty so the color picker is used by default
      colorPicker: "#add8e6", // light blue
      showGrid: false,
    },
    controls: {
      colorText: {
        label: "Color:",
        widget: "text",
        default: "",
      },
      colorPicker: {
        label: "Color Picker:",
        widget: "color",
        default: "#add8e6",
      },
      showGrid: {
        label: "Show Grid",
        widget: "checkbox",
        default: false,
      },
    },
    redrawHandler: () => backgroundDraw(sourceInfo.parameters),
  };

  // Build + render controls in the Result tab's action area
  renderParameterControls(
    sourceInfo,
    buildScriptParameterData(sourceInfo),
    "tab-result"
  );

  // Initial draw
  backgroundDraw(sourceInfo.parameters);
} // end background

/* ------------------------------------------------------------
   backgroundDraw(params)
   Uses original ctx.* style and your wrapper path calls.
------------------------------------------------------------ */
function backgroundDraw(params) {
  const canvas = document.getElementById("sharedCanvas");
  const width = canvas.width;
  const height = canvas.height;

  // Prefer typed text if present; otherwise use the picker
  const typed = (params.colorText || "").trim();
  const color = typed !== "" ? typed : params.colorPicker;
  const grid = params.showGrid === true;

  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = "PapayaWhip";
  ctx.lineWidth = 1;

  fillRect(0, 0, width, height);

  if (grid) {
    let steps = width / 25;
    let xPoint = 25;
    for (let i = 0; i < steps; i++) {
      beginPath();
      moveTo(xPoint, 0);
      lineTo(xPoint, height);
      xPoint += 25;
      stroke();
      closePath();
    }

    steps = height / 25;
    let yPoint = 25;
    for (let i = 0; i < steps; i++) {
      beginPath();
      moveTo(0, yPoint);
      lineTo(width, yPoint);
      yPoint += 25;
      stroke();
      closePath();
    }
  }

  ctx.restore();
} // end backgroundDraw
