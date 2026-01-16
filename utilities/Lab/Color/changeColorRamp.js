/* ===========================================================
   changeColorRamp.js – Lab script (runPattern version)
   -----------------------------------------------------------
   Visualizes a linear color ramp between two chosen colors.

   UI
   --
   Two color pickers:
     1) Start color
     2) End color

   DISPLAY
   -------
   Vertical stack of swatches on the canvas.
   Periodic labels are printed (like showColors.js):
     - index / step
     - rgb(...)
     - hex

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - #sharedCanvas exists
   - window.ctx exists
   - #action and #text exist
=========================================================== */

export function runPattern() {

  const params = {
    startColor: "#0000ff",
    endColor:   "#00ff00"
  };

  const action  = document.getElementById("action");
  const textDiv = document.getElementById("text");

  action.innerHTML = "";
  textDiv.innerHTML = ""; // Lab visual output stays empty

  // ======================================================
  // CONTROL 1 — START COLOR PICKER
  // ======================================================
  const row1 = document.createElement("div");
  row1.className = "ctrl-field";

  const label1 = document.createElement("label");
  label1.textContent = "Start color:";

  const inputStart = document.createElement("input");
  inputStart.type  = "color";
  inputStart.value = params.startColor;

  inputStart.addEventListener("input", () => {
    params.startColor = inputStart.value;
    drawColorRamp(params.startColor, params.endColor);
  });

  row1.appendChild(label1);
  row1.appendChild(inputStart);
  action.appendChild(row1);

  // ======================================================
  // CONTROL 2 — END COLOR PICKER
  // ======================================================
  const row2 = document.createElement("div");
  row2.className = "ctrl-field";

  const label2 = document.createElement("label");
  label2.textContent = "End color:";

  const inputEnd = document.createElement("input");
  inputEnd.type  = "color";
  inputEnd.value = params.endColor;

  inputEnd.addEventListener("input", () => {
    params.endColor = inputEnd.value;
    drawColorRamp(params.startColor, params.endColor);
  });

  row2.appendChild(label2);
  row2.appendChild(inputEnd);
  action.appendChild(row2);

  // ======================================================
  // Initial draw
  // ======================================================
  drawColorRamp(params.startColor, params.endColor);

  return null;

} // end runPattern


/* ===========================================================
   drawColorRamp(startColor, endColor)
=========================================================== */
function drawColorRamp(startColor, endColor) {

  const canvas = document.getElementById("sharedCanvas");
  const width  = canvas.width;
  const height = canvas.height;

  // background
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // ramp settings
  const steps       = 32;     // fixed (no UI control requested)
  const swatchW     = 220;
  const swatchH     = 20;
  const leftMargin  = 10;
  const topMargin   = 10;
  const labelX      = leftMargin + swatchW + 12;

  const rgb1 = parseCssColor(startColor);
  const rgb2 = parseCssColor(endColor);

  // label helper (same style as showColors.js)
  function printLabel(text, x, y) {
    const oldFill = ctx.fillStyle;
    const oldFont = ctx.font;
    ctx.font = "15px Verdana";
    ctx.fillStyle = "blue";
    ctx.fillText(text, x, y + 15);
    ctx.fillStyle = oldFill;
    ctx.font = oldFont;
  }

  // draw swatches vertically
  let y = topMargin;

  for (let i = 0; i < steps; i++) {

    const t = i / (steps - 1);

    const r = Math.round(rgb1[0] + t * (rgb2[0] - rgb1[0]));
    const g = Math.round(rgb1[1] + t * (rgb2[1] - rgb1[1]));
    const b = Math.round(rgb1[2] + t * (rgb2[2] - rgb1[2]));

    const rgbText = `rgb(${r},${g},${b})`;
    const hexText = rgbToHex(r, g, b);

    ctx.fillStyle = rgbText;
    ctx.fillRect(leftMargin, y, swatchW, swatchH);

    // periodic labeling: first, last, and every 4th step
    if (i === 0 || i === steps - 1 || (i % 4) === 0) {
      printLabel(`Step ${i + 1}/${steps}`, labelX, y - 2);
      printLabel(rgbText,              labelX, y + 14);
      printLabel(hexText,              labelX, y + 30);
    }

    y += swatchH;

    // stop if we run out of vertical space (fail-fast is not appropriate here)
    if (y + swatchH > height - 5) break;
  }

  ctx.restore();

} // end drawColorRamp


function parseCssColor(c) {

  const c2 = document.createElement("canvas");
  const c2ctx = c2.getContext("2d");

  c2ctx.fillStyle = c;              // browser normalizes / validates
  const computed = c2ctx.fillStyle; // could be "#rrggbb" OR "rgb(r,g,b)"

  // --------------------------------------------------------
  // Case 1: normalized hex (#rrggbb)
  // --------------------------------------------------------
  if (computed.charAt(0) === "#") {

    // handle #rgb → #rrggbb
    if (computed.length === 4) {
      const r = computed.charAt(1);
      const g = computed.charAt(2);
      const b = computed.charAt(3);
      const rr = r + r;
      const gg = g + g;
      const bb = b + b;
      return [parseInt(rr, 16), parseInt(gg, 16), parseInt(bb, 16)];
    }

    // handle #rrggbb
    if (computed.length === 7) {
      const r = parseInt(computed.slice(1, 3), 16);
      const g = parseInt(computed.slice(3, 5), 16);
      const b = parseInt(computed.slice(5, 7), 16);
      return [r, g, b];
    }

    throw new Error(`parseCssColor: unsupported hex format: ${computed}`);
  }

  // --------------------------------------------------------
  // Case 2: rgb(...) or rgba(...)
  // --------------------------------------------------------
  const nums = computed.match(/\d+/g);

  if (!nums || nums.length < 3) {
    throw new Error(`parseCssColor: cannot parse color: ${c}`);
  }

  return [Number(nums[0]), Number(nums[1]), Number(nums[2])];

} // end parseCssColor



/* ===========================================================
   rgbToHex(r,g,b)
=========================================================== */
function rgbToHex(r, g, b) {

  const rr = r.toString(16).padStart(2, "0");
  const gg = g.toString(16).padStart(2, "0");
  const bb = b.toString(16).padStart(2, "0");

  return "#" + rr + gg + bb;

} // end rgbToHex
