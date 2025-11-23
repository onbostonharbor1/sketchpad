// main.js — Vite entry point

// === Core classes ===
import "./classes/classes.js";
import "./classes/curveStitchClass.js";
import "./classes/ellipseClass.js";
import "./classes/overlayClass.js";

// === Drawing utilities ===
import "./draw/drawState.js";
import "./draw/drawRedefines.js";
import "./draw/color.js";
import "./draw/draw_utilities.js";
import "./draw/drawRegular.js";
import "./draw/ellipse.js";

// === drawRegistry items ===
import "./drawRegistry/2lines.js";
import "./drawRegistry/circularParabola.js";
import "./drawRegistry/inEllipse.js";
import "./drawRegistry/inverseStar.js";
import "./drawRegistry/line.js";
import "./drawRegistry/parabola.js";
import "./drawRegistry/regularPolygon.js";
import "./drawRegistry/bird.js";
import "./drawRegistry/boxes.js";
import "./drawRegistry/lissajous.js";
import "./drawRegistry/nautilus.js";
import "./drawRegistry/regularPursuit.js";

// Registry collector
import "./drawRegistry/drawRegistry.js";

// === UI subsystem ===
import "./ui/uiState.js";
import "./ui/parameterControls.js";
import "./ui/ui_callbacks.js";
import "./ui/actionRegistry.js";
import "./ui/caption.js";
import "./ui/categories.js";
import "./ui/fileLayer.js";
import "./ui/manifest.js";
import "./ui/menuManager.js";
import "./ui/overlay.js";
import "./ui/draw.js";
import "./ui/patterns.js";
import "./ui/gallery.js";
import "./ui/figures.js";
import "./ui/utilities.js";

// UI infrastructure
import "./ui/ui_utilities.js";
import "./ui/setUI.js";
import "./ui/offcanvas.js";

console.log("Sketchpad loaded under Vite.");
