/* ===========================================================
   showColors.js – Lab script (parameterControls version)
   -----------------------------------------------------------
   Visualizes 8 tints and 8 shades of a base color in
   two distinct columns.

   Logic:
   1. Typed text wins over color picker.
   2. Tints: 8 steps, starting at 0.12, incrementing by 0.1.
   3. Shades: 8 steps, starting at 0.08, incrementing by 0.04.
=========================================================== */

import { buildParameterControls } from "/ui/parameterControls.js";

export const scriptInfo = {
  name: "Show Colors",
  id: "showColors",
  version: 0.1,
  category: "Laboratory",
  description: "Visualizes tints and shades of a base color.",

  // --- Registry Controls ---
  controls: {
    colorText: { label: "Color name:", widget: "text", default: "" },
    colorPicker: { label: "Color picker:", widget: "color", default: "#add8e6" }
  },

  // --- Live State ---
  params: {
    colorText: "",
    colorPicker: "#add8e6"
  },

  parameters: null,

  init() {
    this.parameters = this.params;
  },

  draw() {
    const baseColor = resolveColor(this.params);
    drawColors(baseColor);
  },

  redrawHandler() {
    this.draw();
  }
};

/* ===========================================================
   runPattern() — Gallery Entry Point
=========================================================== */
export function runPattern() {
  scriptInfo.init();

  buildParameterControls(
    scriptInfo,
    "tab-scripts",
    true
  );

  scriptInfo.draw();
}

/**
 * resolveColor(params)
 * Logic: Typed text takes precedence. Falls back to picker.
 */
function resolveColor(params) {
  const t = params.colorText.trim();
  if (t !== "") return t;
  return params.colorPicker;
}

/* ===========================================================
   drawColors(baseColor)
   Standardized to use the global window.ctx environment.
=========================================================== */
function drawColors(col = "", xPos = 0, yPos = 0) {
  const canvas = window.drawCanvas;
  if (!canvas || !window.ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const ctx = window.ctx;

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Convert named color → hex
  const baseHex = col.startsWith("#")
    ? col
    : (colourNameToHex(col) || "#add8e6");

  // Helper label printer
  function printLabel(text, x, y) {
    const oldFill = ctx.fillStyle;
    const oldFont = ctx.font;
    ctx.font = "15px Verdana";
    ctx.fillStyle = "blue";
    ctx.fillText(text, x, y + 30);
    ctx.fillStyle = oldFill;
    ctx.font = oldFont;
  }

  // ---------------------------------------------------------
  // COLUMN 1: TINTS
  // ---------------------------------------------------------
  let startY = yPos + 30;
  let x = xPos + 10;
  let tintAmount = 0.12;

  for (let i = 0; i < 8; i++) {
    const { tint } = calculateTintAndShade(baseHex, tintAmount);
    ctx.fillStyle = tint.hex;
    ctx.fillRect(x, startY, 190, 70);

    printLabel(`Tint: ${tintAmount.toFixed(2)}`, x + 200, startY);
    printLabel(tint.hex, x + 200, startY + 18);

    tintAmount += 0.1;
    startY += 70;
  }

  // ---------------------------------------------------------
  // COLUMN 2: SHADES
  // ---------------------------------------------------------
  startY = yPos + 30;
  x = x + 300;
  let shadeAmount = 0.08;

  for (let i = 0; i < 8; i++) {
    const { shade } = calculateTintAndShade(baseHex, shadeAmount);
    ctx.fillStyle = shade.hex;
    ctx.fillRect(x, startY, 190, 70);

    printLabel(`Shade: ${shadeAmount.toFixed(2)}`, x + 200, startY);
    printLabel(shade.hex, x + 200, startY + 18);

    shadeAmount += 0.04;
    startY += 70;
  }

  ctx.restore();
}

/* ===========================================================
   calculateTintAndShade(hexColor, percentage)
=========================================================== */
function calculateTintAndShade(hexColor, percentage) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  const tintR = Math.round(Math.min(255, r + (255 - r) * percentage));
  const tintG = Math.round(Math.min(255, g + (255 - g) * percentage));
  const tintB = Math.round(Math.min(255, b + (255 - b) * percentage));

  const shadeR = Math.round(Math.max(0, r - r * percentage));
  const shadeG = Math.round(Math.max(0, g - g * percentage));
  const shadeB = Math.round(Math.max(0, b - b * percentage));

  const toHex = (val) => val.toString(16).padStart(2, "0");

  return {
    tint: {
      r: tintR, g: tintG, b: tintB,
      hex: "#" + toHex(tintR) + toHex(tintG) + toHex(tintB)
    },
    shade: {
      r: shadeR, g: shadeG, b: shadeB,
      hex: "#" + toHex(shadeR) + toHex(shadeG) + toHex(shadeB)
    }
  };
}

/* ===========================================================
   colourNameToHex(color)
   Full CSS color mapping as per original script.
=========================================================== */
function colourNameToHex(color) {
  color = color.toLowerCase();

  const colours = {
    "aliceblue":"#f0f8ff","antiquewhite":"#faebd7","aqua":"#00ffff",
    "aquamarine":"#7fffd4","azure":"#f0ffff","beige":"#f5f5dc",
    "bisque":"#ffe4c4","black":"#000000","blanchedalmond":"#ffebcd",
    "blue":"#0000ff","blueviolet":"#8a2be2","brown":"#a52a2a",
    "burlywood":"#deb887","cadetblue":"#5f9ea0","chartreuse":"#7fff00",
    "chocolate":"#d2691e","coral":"#ff7f50","cornflowerblue":"#6495ed",
    "cornsilk":"#fff8dc","crimson":"#dc143c","cyan":"#00ffff",
    "darkblue":"#00008b","darkcyan":"#008b8b","darkgoldenrod":"#b8860b",
    "darkgray":"#a9a9a9","darkgreen":"#006400","darkkhaki":"#bdb76b",
    "darkmagenta":"#8b008b","darkolivegreen":"#556b2f","darkorange":"#ff8c00",
    "darkorchid":"#9932cc","darkred":"#8b0000","darksalmon":"#e9967a",
    "darkseagreen":"#8fbc8f","darkslateblue":"#483d8b",
    "darkslategray":"#2f4f4f","darkturquoise":"#00ced1",
    "darkviolet":"#9400d3","deeppink":"#ff1493","deepskyblue":"#00bfff",
    "dimgray":"#696969","dodgerblue":"#1e90ff","firebrick":"#b22222",
    "floralwhite":"#fffaf0","forestgreen":"#228b22","fuchsia":"#ff00ff",
    "gainsboro":"#dcdcdc","ghostwhite":"#f8f8ff","gold":"#ffd700",
    "goldenrod":"#daa520","gray":"#808080","green":"#008000",
    "greenyellow":"#adff2f","honeydew":"#f0fff0","hotpink":"#ff69b4",
    "indianred":"#cd5c5c","indigo":"#4b0082","ivory":"#fffff0",
    "khaki":"#f0e68c","lavender":"#e6e6fa","lavenderblush":"#fff0f5",
    "lawngreen":"#7cfc00","lemonchiffon":"#fffacd","lightblue":"#add8e6",
    "lightcoral":"#f08080","lightcyan":"#e0ffff",
    "lightgoldenrodyellow":"#fafad2","lightgrey":"#d3d3d3",
    "lightgreen":"#90ee90","lightpink":"#ffb6c1","lightsalmon":"#ffa07a",
    "lightseagreen":"#20b2aa","lightskyblue":"#87cefa",
    "lightslategray":"#778899","lightsteelblue":"#b0c4de",
    "lightyellow":"#ffffe0","lime":"#00ff00","limegreen":"#32cd32",
    "linen":"#faf0e6","magenta":"#ff00ff","maroon":"#800000"
  };

  return colours[color] || null;
}
