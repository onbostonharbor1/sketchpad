/* ===========================================================
   changeColorRampHslRgb.js – Utilities Lab script
   -----------------------------------------------------------
   Gallery-script compatible shape:
     - exports scriptInfo
     - exports runPattern(ctx)

   UI (parameterControls-driven)
   ----------------------------
   • Start color picker
   • End color picker
   • Space selector: rgb | hsl
   • Alpha slider
   • Steps slider

   DISPLAY
   -------
   • Vertical swatch stack
   • Periodic labels (step + rgba + hex)

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - ctx is provided by the runner
   - #sharedCanvas exists
   - #action exists
=========================================================== */

export const scriptInfo = {

  title: "Color Ramp (RGB/HSL + Alpha)",

  parameters: {
    startColor: "#0000ff",
    endColor:   "#00ff00",
    steps:      32,
    space:      "rgb",
    alpha:      1
  },

  controls: {
    startColor: { widget: "colorPicker", label: "Start color:" },
    endColor:   { widget: "colorPicker", label: "End color:" },

    space: {
      widget:  "select",
      label:   "Space:",
      options: ["rgb", "hsl"],
      default: "rgb"
    },

    alpha: {
      widget: "range",
      label:  "Alpha:",
      min:    0,
      max:    1,
      step:   0.01
    },

    steps: {
      widget: "range",
      label:  "Steps:",
      min:    2,
      max:    64,
      step:   1
    }
  },

  onParamChange() {
    // no-op (kept for compatibility)
  }, // end onParamChange

  redrawHandler: null

};


/* ===========================================================
   runPattern(ctx)
=========================================================== */
export function runPattern(ctx) {

  if (!ctx) throw new Error("changeColorRampHslRgb: ctx missing");

  // runner will build parameterControls and set scriptInfo.redrawHandler,
  // but we also define it here so redraw always works.
  scriptInfo.redrawHandler = function () {
    drawRamp(ctx, scriptInfo.parameters);
  };

  // initial draw
  scriptInfo.redrawHandler();

} // end runPattern



/* ===========================================================
   drawRamp(ctx, params)
=========================================================== */
function drawRamp(ctx, params) {

  const canvas = document.getElementById("sharedCanvas");
  const width  = canvas.width;
  const height = canvas.height;

  ctx.save();

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const swatchW     = 220;
  const swatchH     = 20;
  const leftMargin  = 10;
  const topMargin   = 10;
  const labelX      = leftMargin + swatchW + 12;

  const colors = changeColor(
    params.startColor,
    params.endColor,
    params.steps,
    params.alpha,
    params.alpha,
    params.space
  );

  function printLabel(text, x, y) {
    const oldFill = ctx.fillStyle;
    const oldFont = ctx.font;

    ctx.font = "15px Verdana";
    ctx.fillStyle = "blue";
    ctx.fillText(text, x, y + 15);

    ctx.fillStyle = oldFill;
    ctx.font = oldFont;
  } // end printLabel

  let y = topMargin;

  for (let i = 0; i < colors.length; i++) {

    const rgbaText = colors[i];

    ctx.fillStyle = rgbaText;
    ctx.fillRect(leftMargin, y, swatchW, swatchH);

    if (i === 0 || i === colors.length - 1 || (i % 4) === 0) {

      const rgb = rgbaToRgb(rgbaText);
      const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);

      printLabel(`Step ${i + 1}/${colors.length}  (${params.space})`, labelX, y - 2);
      printLabel(rgbaText, labelX, y + 14);
      printLabel(hex,      labelX, y + 30);
    }

    y += swatchH;
    if (y + swatchH > height - 5) break;
  }

  ctx.restore();

} // end drawRamp



/* ===========================================================
   changeColor(c1, c2, steps, alpha1, alpha2, space)
=========================================================== */
function changeColor(c1, c2, steps, alpha1 = 1, alpha2 = 1, space = "rgb") {

  function parseColor(c) {

    const tmpCanvas = document.createElement("canvas");
    const tmpCtx = tmpCanvas.getContext("2d");

    tmpCtx.fillStyle = c;
    const computed = tmpCtx.fillStyle;

    if (computed.charAt(0) === "#") {

      if (computed.length === 4) {
        const r = computed.charAt(1);
        const g = computed.charAt(2);
        const b = computed.charAt(3);
        return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)];
      }

      if (computed.length === 7) {
        return [
          parseInt(computed.slice(1, 3), 16),
          parseInt(computed.slice(3, 5), 16),
          parseInt(computed.slice(5, 7), 16)
        ];
      }

      throw new Error(`changeColor.parseColor: unsupported hex format: ${computed}`);
    }

    const nums = computed.match(/\d+/g);

    if (!nums || nums.length < 3) {
      throw new Error(`changeColor.parseColor: cannot parse color: ${c}`);
    }

    return [Number(nums[0]), Number(nums[1]), Number(nums[2])];

  } // end parseColor


  function rgbToHsl(r, g, b) {

    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    let h, s;
    const l = (max + min) / 2;

    if (max === min) {
      h = 0;
      s = 0;
    } else {

      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }

      h /= 6;
    }

    return [h * 360, s, l];

  } // end rgbToHsl


  function hslToRgb(h, s, l) {

    h /= 360;

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {

      function hue2rgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      } // end hue2rgb

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];

  } // end hslToRgb


  const rgb1 = parseColor(c1);
  const rgb2 = parseColor(c2);

  let c1Space, c2Space;

  if (space === "hsl") {
    c1Space = rgbToHsl(rgb1[0], rgb1[1], rgb1[2]);
    c2Space = rgbToHsl(rgb2[0], rgb2[1], rgb2[2]);
  } else {
    c1Space = rgb1;
    c2Space = rgb2;
  }

  const colors = [];

  for (let i = 0; i < steps; i++) {

    const t = i / (steps - 1);
    const a = +(alpha1 + t * (alpha2 - alpha1)).toFixed(3);

    const vals = c1Space.map((v, idx) => v + t * (c2Space[idx] - v));

    let r, g, b;

    if (space === "hsl") {
      const rgb = hslToRgb(vals[0], vals[1], vals[2]);
      r = rgb[0]; g = rgb[1]; b = rgb[2];
    } else {
      r = Math.round(vals[0]);
      g = Math.round(vals[1]);
      b = Math.round(vals[2]);
    }

    colors.push(`rgba(${r},${g},${b},${a})`);
  }

  return colors;

} // end changeColor



/* ===========================================================
   rgbaToRgb("rgba(r,g,b,a)") -> [r,g,b]
=========================================================== */
function rgbaToRgb(rgbaText) {

  const nums = rgbaText.match(/[\d.]+/g);

  if (!nums || nums.length < 3) {
    throw new Error(`rgbaToRgb: cannot parse: ${rgbaText}`);
  }

  return [Number(nums[0]), Number(nums[1]), Number(nums[2])];

} // end rgbaToRgb



/* ===========================================================
   rgbToHex(r,g,b) -> "#rrggbb"
=========================================================== */
function rgbToHex(r, g, b) {

  const rr = r.toString(16).padStart(2, "0");
  const gg = g.toString(16).padStart(2, "0");
  const bb = b.toString(16).padStart(2, "0");

  return "#" + rr + gg + bb;

} // end rgbToHex
