/* figureModel.js
   ============================================================
   Figures Tab -- The Figure Data Model
   ============================================================
   Role:
     Plain data and small helper functions for one figure. No DOM,
     no imports, no drawing. A figure lives in
     uiState.figures.tabs[tabId].figure.

   A figure (this phase):
     name        -- display name, "Untitled 1" until Save As names it
     category    -- null until Save As picks one
     nextPoint   -- the next global point number to hand out;
                    numbers are never reused (used from points mode)
     points      -- flat array of { n, x, y } in canvas pixels
     layers      -- array of layers, array order is z-order
     activeLayer -- index into layers, -1 when there are none

   Exports:
     createEmptyFigure(name)
     nextUntitledName(tabs)
     nextFigureTabId(tabs)
   ============================================================ */

export function createEmptyFigure(name) {
  return {
    name,
    category:    null,
    nextPoint:   1,
    points:      [],
    layers:      [],
    activeLayer: -1
  };
} // end createEmptyFigure


// Smallest "Untitled N" not used by an open figure tab.
export function nextUntitledName(tabs) {
  const used = new Set();
  for (const id in tabs) {
    const f = tabs[id].figure;
    if (f) used.add(f.name);
  }
  let n = 1;
  while (used.has("Untitled " + n)) n++;
  return "Untitled " + n;
} // end nextUntitledName


// Smallest "tab-figure-N" id not used in the tabs object.
export function nextFigureTabId(tabs) {
  let n = 1;
  while (tabs["tab-figure-" + n]) n++;
  return "tab-figure-" + n;
} // end nextFigureTabId

// end figureModel.js
