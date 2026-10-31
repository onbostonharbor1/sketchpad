# Sweep 1 checklist (branch `claude/sweep-1`, 31 October 2026)

The branch sits on top of `claude/docs` (which is `claude1` plus 8 documentation commits), so merging goes:
docs into `claude1` first, then this branch as a fast-forward. Nothing here touches `main`.

Pictures for the iPad: the artifact "Sketchpad Sweep Review" (first half of the sweep) and "Sketchpad: Bootstrap removed,
before and after" (25 screens, tap to flip between before and after).

How to start on the PC: `git fetch`, `git checkout claude/sweep-1`, `npm install`, then `sketchpad.bat`
(or `npm run dev:sketchpad`). Do the gates (section 1), then the tests (section 2) in order. Each test says which commit to
revert if it fails: `git revert <commit>`.

## Commits (oldest first)

| Commit | What |
|---|---|
| `d0cffed` | Test setup: sync lock file, bootstrap dev dependency, import check |
| `47fb051` | Node service: refuse foreign origins, keep paths inside their folders |
| `3fa19dd` | Fix text encoding damage in comments and the Start–End label |
| `6443cf3` | Pursuit manifest: merge the Pursuit2 / pursuit2 duplicate |
| `c27301c` | Fast tab clicks, Utilities Result subtab, Gallery script path (with tests) |
| `4e7875f` | Remove the stale root copies of the Node scripts and ui/foo1.js |
| `8130df9` | Node service: remove the old manifest scanners (about 900 lines) |
| `15ec7f0` | Remove the unused render() fallback; fix a stale header, a sort quirk, duplicate keys |
| `0a8fd5b` | Help pages: match the code after the removals |
| `f6e9075` | Remove UI code nothing calls; keep one Draw runner, in ui/draw/ |
| `7107356` | nodeDispatch: say plainly when the Node service is not running |
| `ebf1119` | npm run build:static: a read-only copy any web server can host |
| `c9588b5` | Node service split into one file per request family |
| `25900fd` | `ui/uiUtilities.js` split (offcanvas, commandsButton, thumbnails, rebuildSync, htmlText) |
| `5c25bad` | `ui/menuCmds.js` split (archiveItem, editManifestDialog, scriptView, draw/drawExport) |
| `8e598a0` | `ui/help.js` split (helpTree, helpEditor); TinyMCE loads on first edit |
| `f848f26` | `index.html` DIV STRUCTURE comment rewritten (comment only); `npm run check:ids` |
| `2626906` | `ui/` imports `armInteractor` / `disarmInteractor`; the `overlay-nextprev` id fixed |
| `7e930f9` | `clearDivs()` reads one region table, `ui/regions.js` |
| `62a08cc` | Home canvas page fails fast without `#canvasOverlayLayers`; damaged comment text repaired |
| `f74073f` | `css/base.css` (the Bootstrap rules the app uses) replaces the Bootstrap stylesheet link |
| `a962472` | Bootstrap removed: own side panel and accordion code, no script, no dependency |
| `71dd92c` | CSS: duplicate rules merged, an empty legacy rule dropped |

## 1. Gates to run first (all on Windows)

| Command | Should print |
|---|---|
| `npm run lint:globals` | 0 errors, 7 warnings (the known `armInteractor` and `gl` ones in Gallery scripts) |
| `npm run check:imports` | `0 problem(s)` |
| `npm run check:ids` | `every looked-up id is in index.html ...` |
| `npm run test:node` | `55 passed, 0 failed` |
| `npm run test:tabs` | a line starting `PASS:` and ending `no errors` |

Checked here on Linux before you look: all five pass. Not checked anywhere: Windows, `sketchpad.bat`, real printing.

## 2. Tests by hand, in this order

**T1. Start.** The Node window prints SUCCESS and "listening". The browser opens with no red error and no page needing
the internet (T14 checks that).

**T2. Node service (commits `47fb051`, `c9588b5`).** For each, do it and look for the result:
- Draw > Cycloid > caption menu v > Create Thumbnail, Create Pattern, Save as secondary. A new file appears each time.
- Patterns or Gallery: Archive an item. The file moves into that category's `archive` folder and leaves the list.
- Any tab: Edit Manifest, change a status, OK. The status shows after the refresh.
- Utilities: Commands > Rebuild and Validate prints a report; Show Logs lists log files.
- Show Script > Open in VS Code, on a script in a folder with a space ("Curve Stitch"). Old Windows quoting is untested;
  this is the case most likely to fail.
- Help: edit and save one help page (T9).
Failure reads: HTTP 403 (foreign origin), 400 (a name it refuses), or "is not defined" / "unknown requestName" in the
Node window. Undo: `git revert c9588b5` (split) or `47fb051` (safety).
- Stop the Node window, then try one of the above: the message says the service did not answer and how to start it.
- Open the app at `http://127.0.0.1:5173` (not localhost): the service calls fail, as before.

**T3. Commands panel and thumbnails (commit `25900fd`).** On every tab (Home, Draw, Patterns, Gallery, Figures,
Utilities) click Commands: the panel opens. In Draw, open the saved-settings (secondary object) thumbnails for an object that
has some, and click one: it loads and the panel closes. Utilities > Commands > Rebuild and Validate: a report shows
and other tabs refresh when you visit them. Failure reads "does not provide an export named ..." in the console.
Undo: `git revert 25900fd`.

**T4. Menus (commit `5c25bad`).** In Patterns, Gallery, Home and Utilities: Edit Manifest (dialog opens, OK saves),
Show Script (text appears in the side panel), Archive. In Draw: Create Pattern and Create Gallery PNG. Failure reads "does
not provide an export named ...". Undo: `git revert 5c25bad`.

**T5. Dragging, welds, arming (commit `2626906`; the part you asked to have tested).** `ui/` now imports
`armInteractor` and `disarmInteractor` instead of calling them through `window`.
1. Draw > Cycloid. Drag a red handle: it moves and the drawing follows. Click a handle, press arrow keys: it moves 1 px;
   Shift + arrow: 10 px.
2. Click another tab and back to Draw: the handles are gone while away and back on return. Choose another Draw object:
   handles of the new object only.
3. Patterns > First Build: drag one corner handle; the linked corners move with it (as in your screenshot).
4. Figures: new figure, insert a parabola and a line. Drag a handle on each. Weld two corners (your Phase 8 gesture),
   drag one: the other follows. Select another layer: only that layer's handles show.
5. Gallery: run `Experimental > variedEllipse` (it calls `window.armInteractor`): its handles drag. This confirms
   Gallery scripts still work.
6. Click tabs quickly (Draw, Figures, Draw, Patterns) and then drag a handle: no stray handles, no console error.
Failure looks like: handles that do not appear, do not move, or stay on screen after leaving the tab.
Undo: `git revert 2626906`.

**T6. Prev / Next zones (same commit).** Patterns > First Build (the one with Prev and Next in the caption). Click the
left quarter of the canvas, then the right quarter: the build changes. Then drag a handle that sits near the left or
right edge: it drags (does not click through to Prev/Next). The line fixed here sets `pointer-events` on the overlay; the
CSS already did, so nothing should look different.

**T7. Switching tabs (commit `7e930f9`).** Visit every tab twice. Leftover content from the tab you left is gone in
`#action` (left column), `#caption`, `#text`, the canvas area. The Figures side strip is hidden on other tabs. Undo: `git revert 7e930f9`.

**T8. Home canvas (commit `62a08cc`).** Home tab: open an item that draws on the canvas. It draws. (The code used to
create a spare overlay div if it was missing; it now stops with an error instead, and the div is in `index.html`.)

**T9. Help (commit `8e598a0`).** Commands > Help from any tab: the Help browser opens, the tree expands, a page shows.
Open a help page and click Edit: the editor appears after a short wait the first time (TinyMCE is fetched then), a second
Edit opens at once. Save writes the file; Cancel closes the editor. Create Help on a missing page opens an empty editor.
Undo: `git revert 8e598a0`.

**T10. Side panel without Bootstrap (commit `a962472`).** On a few tabs (Draw, Patterns, Utilities):
1. Commands: the panel slides in from the right; the page behind dims.
2. Close it three ways, one at a time: the X button; the Escape key; a click on the dimmed area. After each, the dim is
   gone and the page scrolls normally.
3. Open and close it five times. No dim layers pile up (the page is not getting darker).
4. Open it, scroll the page with the mouse wheel: the page behind does not scroll.
5. Commands > Help: the panel closes and the Help browser opens.
6. Show Script (from a Patterns or Gallery item): the script text appears in the panel and it closes as above.
Failure looks like: a panel that will not close, a stuck dim layer, or a panel that does not appear.

**T11. Accordion (same commit).** Draw > Parametrics. Click the "Select Pattern Variant" header: it closes; click again:
it opens. Choose "Four Ended": the drawing changes. If you meet an accordion with more than one section, opening one
should close the others. Failure looks like: a section that will not open or close.

**T12. Looks that pictures cannot show (same commit).** Move the mouse over: a top tab, a subtab, a list item, a button in
the Commands panel; each should brighten or highlight as it did before. Press Tab on the keyboard to move focus onto a top
tab: a focus ring appears as before. Note anything that looks different.

**T13. CSS merges (commit `71dd92c`).** Draw > Commands (button row centered, as before); select a thumbnail in a
thumbnail grid (it has a black outline plus a white and black ring); a colour control: the Coloris colour picker opens
and its text box is hidden; Help browser: the left tree scrolls sideways when a name is long, and tree names are not
underlined or blue.

**T14. No internet needed (commit `a962472`).** Turn Wi-Fi off, reload the app: the tabs, the side panel and the accordion
all look and work as before. (Nothing is loaded from a CDN any more; the Help editor's files come from the app.)

**T15. Pursuit scripts (commit `6443cf3`).** Gallery > Scripts: one "Pursuit Curves in Polygon" in the Pursuit group; run it.

**T16. `git status` after a run** shows no unexpected changed manifests. (If `home/manifest.json` or a category manifest
changed, that is the start-up rebuild, as before. `package-lock.json` should not change by itself.)

## 3. Things you can check from the pictures

1. Chords in Ellipse: the Mode list reads "Start–End", not "Startâ€“End".
2. Gallery > Scripts: one "Pursuit Curves in Polygon" in the Pursuit group, count 10 (was 11).
3. Utilities after leaving and returning: the Result subtab is there and highlighted.
4. Bootstrap before and after: the 25 screens in the second artifact look the same in both states.

## 4. What failure looks like, per area

- Node service: HTTP 403 or 400 and a message naming the field; safe-path rules are in `node/safePaths.mjs`.
- Removals: a menu item or tab does nothing, or a red error naming a missing function. All removed names had no callers by
  search and by `check:imports`; a dynamic call by string is the one thing a search cannot see.
- Splits: "does not provide an export named ..." in the browser console.
- Draw runner move: Draw opens an object but no handles, or it will not redraw when a slider moves.
- Region table: leftover content after a tab switch, or a region that stays hidden.
- Side panel / accordion: see T10 and T11.

## 5. Known things in the result (not bugs introduced here)

- The main tabs' "active tab" shadow is defined in `css/tabs.css` but cancelled by a later `box-shadow: none !important`;
  the active tab has no shadow today, and did not before. A comment in `css/tabs.css` says so.
- `parametrics` needs `#sharedCanvas` in the page, so it fails if run before any canvas tab has opened.
- After the Help button in a Commands panel, both the current tab and Home show as highlighted while the Help browser is
  open (seen before and after this sweep).
- `#categories`, `#drawControls` and the popup menus are created by code, not written in `index.html`, because the region
  they sit in is emptied on each tab change. `index.html` says so.

## 6. Not done, and why

| Item | Why not |
|---|---|
| Draw, Figures and Patterns share one set of object settings (reproduced) | Your call (31 Oct): treat as an accident, revisit later. Item 1a in `NEXT_PASS.md`. Figure layers already work on their own copies, so dragging and welds are unaffected. |
| Script state leak (two scripts fail after about 100 earlier scripts) | Needs a look at which `drawState` fields survive `resetCanvas()` first. |
| `029.JPG` listed in `gallery/Ideabook/possible/manifest.json`, file missing | Remove the entry or restore the file; yours to decide. |
| Unused packages `@jaames/iro`, `dexie`, `sharp`; TinyMCE advisories | Your confirmation. `npm audit fix` updates TinyMCE; check the help editor after (T9). |
| Dead code the splits turned up, no-op placeholders | Not deleted. Listed in `FOLLOWUPS_node-service.md` for your yes. |
| 47 `!important` in the CSS | Removing all of them in `parameterControls.css` changed 8 screens, so each needs separate work. Not started. Listed in `NEXT_PASS.md`. |
| `visibility held in state` (50 `.style.display` assignments), `checkboxWidget.js` child walk | Not started; changes how regions show. `NEXT_PASS.md`, Branch 4. |
| Manifest phase: maintenance runs three times at start, import-time run with `process.exit(1)` | Belongs to the manifest phase you planned before Phase 10. |
| Phase items (handle-drop weld, delete layer, Phase 10, thumbnails, native color input, Phase 9 reshape, template import and welding to templates, instrumentation) | Large; each needs your design call or your eyes. |
| Help Overview PDFs (`docs/*.pdf`) | Not regenerated; the HTML pages and the PDF builder are updated, so rebuilding gives current text. Help pages that still say "Bootstrap" were not rewritten. |

## 7. A copy to look at without Node

`npm run build:static` writes `dist-static/` (about 6 MB, no internet needed). Serve it from the root of a site. See
`scripts/buildStatic.mjs` for the flags. Anything needing the Node service says so.

## 8. New tools this sweep added

- `npm run check:imports`, `npm run check:ids`, `npm run test:node`, `npm run build:static`.
- `scripts/extractBootstrapCss.mjs`: a record of how `css/base.css` was made (needs `npm install --no-save bootstrap@5.3.3`).
- The pixel comparison I used (22 to 25 screens, before and after) is in my probe folder, not the repo. If you want it in
  the repo as `npm run test:pixels`, say so; it would need a stored set of reference pictures.
