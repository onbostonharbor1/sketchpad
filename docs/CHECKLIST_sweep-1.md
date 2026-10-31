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
| `d4982ff` | Deleted unused code (you approved): no-op `deletePackageScript`, `renamePackageScript`, unused `editPackageScript`; 3 unused radio helpers in the Edit Manifest dialog; `serializeParamsObject` and a duplicate `saveSecondaryObject` in `drawExport.js`; unused packages `@jaames/iro`, `dexie`, `sharp` |
| `daf82c0` | Removed the unreachable "show controls" checkbox code, its state field and CSS |
| `911c97b` | `npm audit fix`: tinymce 8.3.2 to 8.10.1, vite 7.1.12 to 7.3.7 (lock file only) |
| `3be737d` | Ideabook: stale `029.JPG` entry removed from `possible/manifest.json` |
| `a7f13f2` | `test:tabs` now also checks the side panel, accordion, Edit Manifest dialog, Show Script, lazy help editor and a Draw handle drag |
| `bd8c915` | `npm run pixels:save` and `pixels:compare` (25 pictures before and after a change; adds the `pngjs` dev dependency) |
| `b73d47c` | `test:node` grows to 60 checks: writers, `editManifestEntry`, log requests, dispatcher table; Node follow-ups: atomic writes, shared manifest-folder list and helpers, quiet switch, comments fixed |
| `1e2562d` | Offcanvas aliases removed; help pages match the helpers that moved out of `uiUtilities.js` |

## 1. Gates to run first (all on Windows)

| Command | Should print |
|---|---|
| `npm run lint:globals` | 0 errors, 7 warnings (the known `armInteractor` and `gl` ones in Gallery scripts) |
| `npm run check:imports` | `0 problem(s)` |
| `npm run check:ids` | `every looked-up id is in index.html ...` |
| `npm run test:node` | `60 passed, 0 failed` |
| `npm run test:tabs` | a line starting `PASS:` and ending `no errors` |

`test:tabs` now also does, by itself, what T9, T10, T11 and part of T5 ask for (commit `a7f13f2`): opens the side panel and closes
it with Escape, a click on the dimmed area and the X button; opens and closes it five times and checks no dim layer is left;
the Help button inside it; the Draw > Parametrics accordion closing and opening; the Edit Manifest dialog opening and
cancelling; Show Script; that TinyMCE is not fetched until a help page is edited and then opens with its menu bar; and
dragging Draw > Cycloid's first handle 30 px right and 20 px down, then leaving the tab (handle layer gone). So if
`test:tabs` passes on your PC, do the hand versions of those only to see how they feel (animation, hover, the looks the
test cannot judge).

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

**T16. Deleted code (commit `d4982ff`).** `npm install` removes the three packages (it will take a moment). `npm run test:node`
prints `60 passed` (the three deleted request names are no longer tested; later commits added more checks). Then use the things that
sit next to what was removed: Edit Manifest on any item (dialog opens; pick a preset status, type a custom one, clear
it; OK saves), Draw > caption menu v > Create Pattern, Create Gallery PNG, Save as secondary (each still works). The
Coloris colour picker still opens in Draw (the colour picker library stays; `@jaames/iro` was a different, unused one).
Failure reads "... is not defined" or "does not provide an export named ...". Undo: `git revert d4982ff`.

**T17. Show-controls removal, npm update, Ideabook (commits `daf82c0`, `911c97b`, `3be737d`).**
1. `npm install`, then start the app. Draw > Parametrics: tick and untick "Show Intersection Dots": the drawing changes
   each time (checkboxes still work without the removed code). Undo: `git revert daf82c0`.
2. Help editor with the new TinyMCE 8.10.1: Help > open a page > Edit: the editor opens with a menu bar and toolbar, type
   a few words, Save, reopen the page: the words are there; Cancel closes without saving. The editor's skin, plugin and icon
   files in `public/tinymce` were copied from an older TinyMCE (January) and the program code is now newer; it opened with
   no console errors here, but if a toolbar button or menu item is missing or broken, that is the cause and the fix is to
   copy the files again from `node_modules/tinymce`. Undo: `git revert 911c97b` (puts the lock file back; then `npm install`).
3. The dev server (Vite 7.3.7) starts and the app loads as before.
4. Gallery > Ideabook: "possible" now shows one fewer picture (the missing 029 is gone); pictures 028 and 030 still show;
   "ok" still shows 029. Undo: `git revert 3be737d`.

**T18. The picture tools (commit `bd8c915`).** With the app running: `npm run pixels:save -- one`, then
`npm run pixels:save -- two`, then `npm run pixels:compare -- one two`. It should print 25 lines of `identical` (or
`same`) and `All 25 pictures match.` Two runs of the same code must match; if some differ, tell me which (it may be
timing on your machine). `npm install` adds `pngjs` first. Then delete the `pixel-refs` folder. Undo: `git revert bd8c915`.

**T19. Node follow-ups (commit `b73d47c`) and aliases (commit `1e2562d`).**
1. `npm run test:node` prints `60 passed`.
2. Every Node-backed thing you did in T2 still works. What changed underneath: every file the service writes is now
   written to a temporary file and renamed over the real one, so after any of those actions look in the folder:
   there must be no file ending in `.tmp`. A failure reads "EPERM" or "EBUSY" in the Node window: Windows refused the
   rename (another program, such as VS Code or a virus checker, had the file open); the service then falls back to
   copying over it, so the action should still succeed. If it fails, tell me the file.
3. Start the Node window with `set SKETCHPAD_QUIET=1` first (then `node node/sketchpadServer.mjs`): the window stops
   printing one line per request.
4. The Commands panels on all six tabs still open (T3) and the secondary-thumbnail grid in Draw still opens (the names
   `showCommandsOffcanvas` and `showOffcanvasPanel` are gone). Undo: `git revert 1e2562d`.
5. Help > Overview > Subsystems > "uiUtilities.js and the helpers that came out of it": the page reads correctly.

**T20. `git status` after a run** shows no unexpected changed manifests. (If `home/manifest.json` or a category manifest
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
| Five moderate advisories (eslint chain, dev only) | The fix `npm audit` offers is a breaking eslint change. Left alone. |
| What is left in `FOLLOWUPS_node-service.md` | Few items: confirm two Node scripts are still wanted, one possible duplicate escape function, the manifest-run guard and VS Code quoting (Runbook Job 4), splitting the Edit Manifest dialog file. Everything else on that list is done. |
| 46 `!important` in the CSS, the 46 show/hide lines, fixed `#categories` / `#drawControls`, and the small items | Written as step-by-step jobs in `docs/RUNBOOK_deferred.md` for you to do on the PC (Jobs 1 to 4). |
| Visibility held in state: 46 `.style.display` assignments remain | One by one, section 7 below lists each with its own check; the recipe is Job 2 in `docs/RUNBOOK_deferred.md`. The checkbox walk (the one that read the page) was dead code and is gone. |
| Manifest phase: maintenance runs three times at start, import-time run with `process.exit(1)` | Belongs to the manifest phase you planned before Phase 10. |
| Phase items (handle-drop weld, delete layer, Phase 10, thumbnails, native color input, Phase 9 reshape, template import and welding to templates, instrumentation) | Large; each needs your design call or your eyes. |
| Help Overview PDFs (`docs/*.pdf`) | Not regenerated; the HTML pages and the PDF builder are updated, so rebuilding gives current text. Help pages that still say "Bootstrap" were not rewritten. |

## 7. Show / hide code left as it is (check each one when it is converted)

Today each of these sets `element.style.display` directly, so whether a thing is shown lives on the page and not in
state. Converting one means giving it a named flag in `uiState` and one function that applies the flags. Each needs its own
look, because the result depends on when the region is rebuilt. Count: 46 lines in `ui/`. Grouped here where one check
covers the group.

| Where (lines) | What it shows or hides | Check when converted |
|---|---|---|
| `ui/figures/figuresNav.js` (9) | Figures layout: `#text` versus the canvas wrapper, `#action`, the side strip, the button strip, the points-mode toggle | Figures: open the category list, open a figure, back to the list, points mode on and off, switch tabs and return; each time the right panes show |
| `ui/figures/figurePointer.js` (2), `ui/figures/figures.js` (1) | The pointer layer and the canvas while a figure is open | Figures: weld message and layer show while pointing, gone after leaving the tab |
| `ui/overlay.js` (7) | The popup layers: Help, Notes, forms, debug, and the container | Open and close Help, Notes (Draw item), Edit Manifest; each opens, closes, and leaves no layer showing |
| `ui/help.js` (1), `ui/helpEditor.js` (1), `ui/editManifestDialog.js` (2) | The container the Help browser, the editor and the dialog open into | Help browser, Help editor, Edit Manifest dialog each appear and disappear |
| `ui/nextPrevOverlay.js` (3) | The Prev / Next overlay | Patterns > First Build shows it; every other tab and item does not |
| `ui/interactor.js` (3), `ui/canvasLayerManager.js` (1) | The interaction layer and overlay layers while handles are armed | Handles show when armed, vanish on leaving the item or tab |
| `ui/scriptRunner.js` (1), `ui/draw/drawRunner.js` (1), `ui/home/home.js` (1) | The canvas wrapper when a script or Draw object runs | Run a Gallery script, a Draw object, a Home item: canvas appears; the next list view hides it |
| `ui/caption.js` (1) | The caption bar | Caption shows on tabs that use it, empty on others |
| `ui/categories.js` (1) | A category item row | Category lists show rows as before in every tab |
| `ui/controls/rendering/renderer.js` (1) | The interface-controls strip when it has content | A Draw object with interface controls shows them; one without leaves no empty box |
| `ui/controls/widgets/thumbnailWidget.js` (1), `textWidget.js` (2) | A thumbnail grid and a text control | Secondary thumbnails grid shows; a read-only text control shows |
| `ui/gallery/galleryResults.js` (1), `ui/home/homeResults.js` (1) | An image in Gallery and Home results | A Gallery pattern and a Home image appear when selected |
| `ui/setUI.js` (1) | The "failed to start" message | Only shown if start-up fails; test by breaking an import and reloading |
| `ui/uiUtilities.js` (3) | The region table (already one list in `ui/regions.js`) | T7 covers it |

## 8. A copy to look at without Node

`npm run build:static` writes `dist-static/` (about 6 MB, no internet needed). Serve it from the root of a site. See
`scripts/buildStatic.mjs` for the flags. Anything needing the Node service says so.

## 9. New tools this sweep added

- `npm run check:imports`, `npm run check:ids`, `npm run test:node`, `npm run build:static`.
- `scripts/extractBootstrapCss.mjs`: a record of how `css/base.css` was made (needs `npm install --no-save bootstrap@5.3.3`).
- `npm run pixels:save -- <name>` and `npm run pixels:compare -- <before> <after>`: 25 pictures of the app, before and after
  a change (`tests/pixelShots.mjs`, `tests/pixelCompare.mjs`; pictures go in `pixel-refs/`, not committed). Uses `pngjs`.
- `docs/RUNBOOK_deferred.md`: step-by-step jobs for the work deferred from this sweep.
