/*
  drawMain.js — Vite entry for draw.html (NO UI)

  RULE:
    This file contains ONLY imports. No executable test code.
*/

// === Drawing state (installs ctx getter, creates/uses sharedCanvas) ===
import "./draw/drawState.js";

// === Core classes ===
import "./classes/classes.js";
import "./classes/curveStitchClass.js";
import "./classes/ellipseClass.js";
import "./classes/linkedCircles.js";
import "./classes/overlayClass.js";
import "./classes/radiate.js";

// === Drawing utilities ===
import "./draw/drawRedefines.js";
import "./draw/color.js";
import "./draw/draw_utilities.js";
import "./draw/drawLinkedCircles.js";
import "./draw/drawRegular.js";
import "./draw/ellipse.js";
import "./draw/unicorns.js";

console.log("drawMain.js loaded (imports only).");
