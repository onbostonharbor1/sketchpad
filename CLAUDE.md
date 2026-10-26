# Sketchpad: notes for Claude

Barry's hand-rolled JavaScript canvas app for parametric curve-stitch geometry. The end goal is a printable
point template for pounding nails into wood. Barry is a retired technical writer and an old-time maintenance
programmer. He wants to understand every line, so favor plain, readable code over clever code.
Phase order and status are in PHASES.md. Read it before starting work.

## How to work with Barry

- Talk like a trusted friend: direct, no preamble, no praise, no sycophancy. Push back when he is wrong.
- Design discussion first, then build. Answer-seeking questions get answers; "thoughts" means discuss, do not build.
  Do not start anything until he says go.
- Once the objective is clear, hand over a whole unit of work, not sentence-level back and forth.
- Phases come from his numbered list in PHASES.md. Do one phase at a time and stop at the hold he sets.
- Each phase is done on a branch that he reviews and merges into `claude1`. The working branch is deleted
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
- `ui/interactor.js`: drag handles on `params.points` for one armed object at a time.
- Figures (`ui/figures/`): `figureModel.js` (data), `figuresNav.js` (subtabs, caption tools, left buttons),
  `figureLayers.js` (insert, draw, dim, select), `figuresCommands.js`, `figuresDisplay.js`, `figures.js` (TabSpec).
  A figure is `{name, category, nextPoint, points[], layers[], drawOrder[], activeLayer}` in
  `uiState.figures.tabs[tabId].figure`. Layer numbers are stable; `drawOrder` (top first) is separate.
- `node/`: the local Node service on port 5174, request shape `{requestName, payload}`.

## Running and testing

- `npx vite --port 5173 --strictPort` and `node node/sketchpadServer.mjs` (or `sketchpad.bat`).
- `npm run test:tabs` runs the Playwright tab-switch tests (set `TEST_LOCAL_BOOTSTRAP=1` where the CDN is blocked).
  Extend it with every phase. Verify changes in the real app, not just by reading code.
- `npm run lint:globals` must report zero errors. Eleven warnings in gallery scripts are known and are Barry's.
- Tests that edit manifests change repo files (`gallery/Ideabook/3D/manifest.json`, `home/manifest.json`);
  revert them with `git checkout` before committing.

## Commit hygiene

Small, described commits. Branch per phase. Do not push to `main`.
