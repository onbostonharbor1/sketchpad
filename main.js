// main.js — Vite entry point

// === Core classes ===
import "./classes/classes.js";
import "./classes/curveStitchClass.js";
import "./classes/ellipseClass.js";
import "./classes/linkedCircles.js";
import "./classes/overlayClass.js";
import "./classes/radiate.js";

// === Drawing utilities ===
import "./draw/drawState.js";
import "./draw/color.js";
import "./draw/drawUtilities.js";
import "./draw/drawLinkedCircles.js";
import "./draw/drawRegular.js";
import "./draw/drawEllipse.js";
import "./draw/drawUnicorns.js";

// === drawRegistry items ===
import "./drawRegistry/2lines.js";
import "./drawRegistry/circularParabola.js";
import "./drawRegistry/cycloid.js";
import "./drawRegistry/inEllipse.js";
import "./drawRegistry/inverseStar.js";
import "./drawRegistry/line.js";
import "./drawRegistry/linkedCircles.js";
import "./drawRegistry/mysticRose.js";
import "./drawRegistry/mysticRoseEllipse.js";
import "./drawRegistry/parabola.js";
import "./drawRegistry/parametrics.js";
import "./drawRegistry/radiate.js";
import "./drawRegistry/regularPolygon.js";
import "./drawRegistry/bird.js";
import "./drawRegistry/nautilus.js";
import "./drawRegistry/regularPursuit.js";

// Registry collector
import "./drawRegistry/drawRegistry.js";

// === UI subsystem ===
import "./ui/uiState.js";
import "./ui/uiCallbacks.js";

import "./ui/actionRegistry.js";
import "./ui/caption.js";
import "./ui/categories.js";
import "./ui/fileLayer.js";
import "./ui/help.js";
import "./ui/manifest.js";
import "./ui/menuCmds.js";
import "./ui/menuManager.js";
import "./ui/nextPrevOverlay.js";
import './ui/nodeLayer.js'
import "./ui/overlay.js";
import "./ui/parameterControls.js";
import "./ui/scriptRunner.js";
import "./ui/tinyMceConfig.js";

import "./ui/draw.js";
import "./ui/drawMenuCmds.js";
import "./ui/figures.js";
import "./ui/gallery.js";
import "./ui/galleryMenuCmds.js";
import "./ui/home.js";
import "./ui/homeMenuCmds.js";
import "./ui/patterns.js";
import "./ui/patternsMenuCmds.js";
import "./ui/utilities.js";
import "./ui/utilitiesMenuCmds.js";

// UI infrastructure
import "./ui/uiUtilities.js";
import "./ui/setUI.js";

console.log("Sketchpad loaded under Vite.");
