# Sketchpad: notes for Claude

Barry's hand-rolled JavaScript canvas app for parametric curve-stitch geometry. The end goal is a printable
point template for pounding nails into wood. Barry is a retired technical writer and an old-time maintenance
programmer. He wants to understand every line, so favor plain, readable code over clever code.
Phase order and status are in PHASES.md. Read it before starting work.

## What Sketchpad is for (two purposes, Barry 2026-10-27)

1. A printable point template for pounding nails into wood (the end goal above).
2. A place to sketch: to explore designs easily by working with how objects are represented and how they relate
   to each other. He could not do this in the original StringThing, and it is why the app is called Sketchpad.
   Circular Parabola (Multi), whose second handle separates and joins four copies, and Linked Circles, whose link
   styles (pairwise, ring, all-to-all) make tubes and rings from a few circles, are examples he keeps around
   because they are interesting to play with, not because a template needs them.
   Making exploration cheap is a major function, not a side effect (Barry 2026-11-01). Best example:
   `gallery/Scripts/Curve Stitch/manyRowsColumns.js`, where copies are added with a slider and shared points are
   dragged, so one drag reshapes its neighbours. It led him to designs he would not have thought of. His aim is
   original work rather than formulaic craft, and Sketchpad is his assistant for that.

Do not treat the second purpose as clutter or as a means to the first. When a decision trades one against the other
(trimming a control range, dropping an object that nails cannot use, forcing every object through one drawing
path), say so and let him decide.


## How to work with Barry

- Talk like a trusted friend: direct, no preamble, no praise, no sycophancy. Push back when he is wrong.
- Design discussion first, then build. Answer-seeking questions get answers; "thoughts" means discuss, do not build.
  Do not start anything until he says go.
- Once the objective is clear, hand over a whole unit of work, not sentence-level back and forth.
- Phases come from his numbered list in PHASES.md. Do one phase at a time and stop at the hold he sets.
- Each phase is done on a branch that he reviews and merges into `claude1` (unless he says otherwise, as for 7b). The working branch is deleted
  afterward, so the repo has only `main` and `claude1`. Merge only when asked (fast-forward).
- He works on Windows in VS Code (repo at C:\Users\barry\Desktop\sketchpad). Open-in-editor means VS Code only.
- Do not end every reply with a question.

## Vocabulary

- Handle: one of an object's own draggable red dots (`params.points`). The only draggable points.
- Disc: the filled circle placed on a layer, anchored to an infrastructure line or free. Not draggable; it rides
  along with its object. (Formerly "drag circle".)
- Infrastructure line: carries discs. Stitch lines do not.

## Design rules (his, hard)

- Resist globals. A global value must be declared in its state object (`uiState` or `drawState`), never implicit.
- State is written through immediately, so tab switches need no save tracking.
- No ad hoc divs. The fixed structure in `index.html` stays. The one shared `clearDivs()` in `ui/uiUtilities.js`
  tears down every tab; keep teardown code minimal. The permanent `#button` div is not cleared, so anything added
  to it per tab must carry the class `tab-extra`, which `clearDivs()` removes.
- Reuse before inventing: understand the existing data flow, then reuse it or build something similar.
- UI owns the definition; Draw owns the implementation. Controls live on the UI side and act by redefining
  the definition.
- Draw registry objects reach the canvas only through `drawLine` (`draw/drawUtilities.js`). `drawState.final` is
  the only render-mode flag: when true, `drawLine` draws just the points.
- Gallery scripts are an experimental playpen and are never promoted as-is. Promotion means pulling reusable
  code into draw files, then he minimizes it, then it becomes a registry file.
- Registry names are permanent API, because saved figures will refer to them.
- Header comments at the top of each source file describe what the file does. The Notes popup reads them.
- Some drawRegistry objects exist only as tests or variations. Do not delete them unasked.

## Architecture in brief

- `ui/setUI.js`: tab activation. Decision order: needsUpdate, then init(true); else saved, then restore;
  else init(false). Tabs are TabSpecs (init, save, restore, action, subtabs, caption, text, sketchpad).
- `drawRegistry/*.js`: one file per drawable object, each a singleton with `params`, `controls`, `init`,
  `update`, `draw`. Assembled in `drawRegistry/drawRegistry.js`. For several independent copies (figure layers),
  use `Object.create(entry)` with `structuredClone(entry.params)` and call `init()`.
- `ui/controls`: `buildParameterControls(info, "tab-draw", true)` renders an object's sliders into `#action`.
- `ui/interactor.js`: drag handles on `params.points` for one armed object at a time. A pressed handle is selected
  and the arrow keys nudge it (1 px, 10 with Shift). All handle moves go through `moveHandle`.
- Figures (`ui/figures/`): `figureModel.js` (data), `figuresNav.js` (subtabs, caption tools, left buttons),
  `figureLayers.js` (insert, select, delete, hide), `figureDraw.js` (draw, dim), `figureLayerPanel.js` (number strip,
  controls, arming), `figureBreakApart.js`, `figureWelds.js` with `figureWeldModel.js`, `figureWeldMove.js` and
  `figureWeldMarks.js` (welds: make, data, follow, marks), `figureCentroid.js` (centroid, bounding box, move and rotate a
  layer), `figuresCommands.js`, `figuresDisplay.js`, `figures.js` (TabSpec).
  A figure is `{name, category, nextPoint, points[], layers[], drawOrder[], activeLayer}` in
  `uiState.figures.tabs[tabId].figure`. Layer numbers are stable; `drawOrder` (top first) is separate.
- Layer transform (`draw/drawTransform.js`): each figure layer has `transform {angle, tx, ty}`. Objects draw in
  object space; `drawLine` maps through `drawState.transform` (null outside a figure layer) and notes
  `drawState.bounds`. Anything that shows or hits a handle or disc maps through the same transform
  (`interactor.js` via `getTransform`, `figurePoints.js`). No ctx.translate or ctx.rotate.
- Errors (`ui/errorReport.js`): catch only at choke points (a figure layer's draw, the Draw redraw, a tab switch,
  opening a file) and call `reportError(where, err)`; never scatter try/catch through logic. It shows the red
  `#errorBar` (all tabs) and appends once to `utilities/logfiles/errors_<date>.txt`; Home summarises the newest log.
  Start-up runs `checkDrawRegistry` (`ui/registryCheck.js`); figure files are checked by `checkFigureFormat`.
- Ideabook hint scripts: `gallery/Ideabook/<category>/scripts/<image name>.js` (& , # ? % + ; written as _),
  shown by the caption's Run script button. Shared routines in `gallery/Ideabook/scripts/ideabookRoutines.js`
  (StringThing style: defaults, nothing refused, all through `drawLine`); the pursuit engine is `pursuitEngine.js`
  beside it, to become a draw function. Hints, not copies; the header of each says what was guessed.
- `node/`: the local Node service on port 5174, request shape `{requestName, payload}`. The page posts to `/dispatch`
  on its own server and Vite passes it on (`vite.config.js`), so it also works in a GitHub Codespace
  (`.devcontainer/`), e.g. from the iPad.

## Running and testing

- `npx vite --port 5173 --strictPort` and `node node/sketchpadServer.mjs` (or `sketchpad.bat`).
- `npm run test:tabs` runs the Playwright tab-switch tests (set `TEST_LOCAL_BOOTSTRAP=1` where the CDN is blocked).
  Extend it with every phase. Verify changes in the real app, not just by reading code.
- `npm run test:regression` draws every Draw object and every pattern and gallery script and compares each with its
  approved copy in `tests/regression/` (report in `tests/regression/report.html`). Run it before every review. An
  intended change is approved with `npm run test:regression -- accept <name>`, and the new approved copy is committed.
- `npm run test:errors` tests the error bar, the error log, the Home summary and the registry and figure-file checks.
- `npm run test:history` tests Script history (VS Code's saved versions of a script; `ui/scriptHistory.js`).
- `npm run test:ideabook` tests the Ideabook Run script button and runs every hint script.
- `npm run lint:globals` must report zero errors. Eleven warnings in gallery scripts are known and are Barry's.
- Tests that edit manifests change repo files (`gallery/Ideabook/3D/manifest.json`, `home/manifest.json`);
  revert them with `git checkout` before committing.

## Commit hygiene

Small, described commits. Branch per phase. Do not push to `main`.
