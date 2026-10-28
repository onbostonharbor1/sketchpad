/* figureModel.js
   ============================================================
   Figures Tab -- The Figure Data Model
   ============================================================
   Role:
     Plain data and small helper functions for one figure. No DOM,
     no imports, no drawing. A figure lives in
     uiState.figures.tabs[tabId].figure.

   A figure is plain data, nothing but numbers, strings, arrays and
   plain objects. That is on purpose: it can be copied with
   structuredClone(), written to a file with JSON.stringify() (Save
   As, Phase 10), and compared or snapshotted (a possible undo). The
   live drawing objects (instances) that draw each layer are kept
   beside it in tabState.instances, never inside it.

   A figure, field by field:
     name        -- display name, "Untitled 1" until Save As names it
     category    -- null until Save As picks one
     nextPoint   -- the next point number to hand out. Numbers are
                    never reused, even after a point is deleted, so
                    a number names one disc for good (welds refer to
                    discs by number).
     points      -- every disc of every layer, in one flat array.
                    Two shapes (figurePoints.js has the details):
                      { n, kind: "anchored", layer, arm, t, x, y, dx, dy }
                      { n, kind: "free",     layer, x, y, dx, dy, ox, oy }
                    An anchored disc sits at fraction t along an
                    infrastructure arm of its layer's object and
                    follows it. A free disc sits where it was put,
                    stored in its layer's object space (ox, oy).
     layers      -- one entry per inserted object (figureLayers.js):
                      { kind, id, visible, color, params, transform }
                    A layer's number is its index plus one and never
                    changes; layers are never removed (hidden instead).
     drawOrder   -- layer indices, top of the stack first. Kept
                    separate from layers so restacking never
                    renumbers anything.
     activeLayer -- index into layers, -1 when there are none. Only
                    the active layer can be edited.
     welds       -- added by figureWelds.js on the first weld (absent
                    until then):
                      [ { members: [ { layer, n }, ... ] }, ... ]
                    Each entry ties together discs that must stay
                    on the same spot.

   Exports:
     createEmptyFigure(name)
     nextUntitledName(tabs)
     nextFigureTabId(tabs)
   ============================================================ */

// A new, empty figure. Called by openNewFigureTab() in figuresNav.js.
// "welds" is not listed here; figureWelds.js creates it the first
// time two discs are welded, and every reader allows for it being
// missing (figure.welds || []).
export function createEmptyFigure(name) {
  return {
    name,               // shorthand for  name: name
    category:    null,
    nextPoint:   1,
    points:      [],
    layers:      [],
    drawOrder:   [],   // layer indices, top of the stack first
    activeLayer: -1
  };
} // end createEmptyFigure


// Smallest "Untitled N" not used by an open figure tab.
// tabs is uiState.figures.tabs: an object keyed by tab id, one of which
// ("tab-categories") has no figure, hence the "if (f)".
export function nextUntitledName(tabs) {
  const used = new Set();          // a Set holds each value once; .has() asks
  for (const id in tabs) {         // "for ... in" walks an object's keys
    const f = tabs[id].figure;
    if (f) used.add(f.name);
  }
  let n = 1;
  while (used.has("Untitled " + n)) n++;
  return "Untitled " + n;
} // end nextUntitledName


// Smallest "tab-figure-N" id not used in the tabs object. A closed
// tab's id becomes free again, unlike a point number: tab ids are
// only screen bookkeeping and nothing else refers to them.
export function nextFigureTabId(tabs) {
  let n = 1;
  while (tabs["tab-figure-" + n]) n++;
  return "tab-figure-" + n;
} // end nextFigureTabId

// end figureModel.js
