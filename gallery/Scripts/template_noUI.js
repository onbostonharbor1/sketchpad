/* ============================================================
   Template 2 — Gallery Script (No UI)
   ------------------------------------------------------------
   Usage:
     - Appears in Gallery > Scripts
     - runPattern() is executed automatically by gallery.js
     - Provides a clean drawing sandbox on the shared canvas
   ============================================================ */

import { printTitle } from "../../draw/draw_utilities.js";

/* ------------------------------------------------------------
   runPattern()
   Entry point called by Gallery loader.
------------------------------------------------------------ */
export function runPattern() {
  printTitle("Template 2 — No UI Script");

  // --- Clear canvas ---
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  ctx.restore();

  // --- Example drawing (delete or replace) ---
  ctx.beginPath();
  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 2;
  ctx.arc(drawCanvas.width/2, drawCanvas.height/2, 120, 0, Math.PI*2);
  ctx.stroke();
} // end runPattern
