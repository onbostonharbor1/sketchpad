// main.js â€” Vite entry point


import '@melloware/coloris/dist/coloris.css';
import Coloris from '@melloware/coloris';

// This line is the "magic" that fixes the ReferenceError:
window.Coloris = Coloris;

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
import "./draw/createNodes.js";
import "./draw/drawUtilities.js";
import "./draw/drawLinkedCircles.js";
import "./draw/drawRegular.js";
import "./draw/drawEllipse.js";
import "./draw/drawUnicorns.js";

// === drawRegistry items ===
import "./drawRegistry/circularParabola.js";
import "./drawRegistry/circularParabolaMulti.js";
import "./drawRegistry/cycloid.js";
import "./drawRegistry/inEllipse.js";
import "./drawRegistry/inverseStar.js";
import "./drawRegistry/drawLine.js";
import "./drawRegistry/linkedCircles.js";
import "./drawRegistry/mysticRose.js";
import "./drawRegistry/mysticRoseEllipse.js";
import "./drawRegistry/parabola.js";
import "./drawRegistry/parametrics.js";
import "./drawRegistry/radiate.js";
import "./drawRegistry/regularPolygon.js";
import "./drawRegistry/regularPursuit.js";

// Registry collector
import "./drawRegistry/drawRegistry.js";

// === UI subsystem ===
import "/ui/uiState.js";
import "/ui/uiCallbacks.js";

import "/ui/actionRegistry.js";
import "/ui/canvasLayerManager.js"
import "/ui/caption.js";
import "/ui/categories.js";
import "/ui/drawRunner.js";
import "/ui/fileLayer.js";
import "/ui/help.js";
import "/ui/interactor.js";
import "/ui/manifest.js";
import "/ui/menuCmds.js";
import "/ui/menuManager.js";
import "/ui/nextPrevOverlay.js";
import '/ui/nodeLayer.js'
import "/ui/overlay.js";
import "/ui/parameterControls.js";
import "/ui/resultsViewController";
import "/ui/scriptRunner.js";
import "/ui/draw/secondaryObjects.js";

import "/ui/draw/draw.js";
import "/ui/draw/drawCategories.js";
import "/ui/draw/drawMenuCmds.js";
import "/ui/draw/drawNav.js";
import "/ui/draw/drawRunner.js";
import "/ui/draw/drawTabState.js";
import "/ui/figures/figures.js";
import "/ui/figures/figuresMenuCmds.js";
import "/ui/gallery/gallery.js";
import "/ui/gallery/galleryMenuCmds.js";
import "/ui/home/home.js";
import "/ui/home/homeMenuCmds.js";
import "/ui/patterns/patterns.js";
import "/ui/patterns/patternsMenuCmds.js";
import "/ui/utilities/utilities.js";
import "/ui/utilities/utilitiesMenuCmds.js";

// UI infrastructure
import "/ui/uiUtilities.js";
import "/ui/setUI.js";


/* ------------------------------------------------------------
   Coloris Initialization
   ------------------------------------------------------------ */
   document.addEventListener('DOMContentLoaded', () => {
    if (window.Coloris) {
      // We target the class directly so it doesn't try to auto-init
      window.Coloris.init();
      window.Coloris({
        el: '.ctrl-color-input',
        format: 'hsl',
        alpha: true,
        theme: 'dark',
        themeMode: 'dark',
        wrap: true
      });
    }
  });



console.log("Sketchpad loaded under Vite.");
