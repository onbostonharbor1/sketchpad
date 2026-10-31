# Runbook: the work deferred from sweep 1 (to do on the PC, 31 October 2026)

For the jobs that need your eyes. Each one is self-contained: goal, what to look at first, steps, how to check, how to
undo. Do them in any order; each is on its own branch off `claude1` (after the sweep is merged). Hand any one to Claude
Code on the PC as it stands.

Before any of them:

1. The sweep is merged: `claude/docs` into `claude1`, then `claude/sweep-1` as a fast-forward, and the checklist
   (`docs/CHECKLIST_sweep-1.md`) is done.
2. `git checkout claude1`, `git pull`, `npm install`.
3. Start the app: `sketchpad.bat` (or `npm run dev:all`). Leave it running.
4. New branch for the job: `git checkout -b job-<name>`.

## The safety net: pictures before and after

`npm run pixels:save -- before` takes 25 pictures of the app (every tab, each Commands panel, the Help browser, the Edit
Manifest dialog, the Parametrics accordion) into `pixel-refs/before/`. After a change, `npm run pixels:save -- after`, then
`npm run pixels:compare -- before after`. It prints `identical` or `DIFFERENT` for each picture and puts a red-marked copy
of each different one in `pixel-refs/diff-after/`. Differences of 8 levels out of 255 or less are ignored.

What it cannot see: hover, focus, disabled looks, animation, and any state it does not visit. Each job below says which of
those to look at by hand.

Also after every change: `npm run lint:globals`, `npm run check:imports`, `npm run check:ids`, `npm run test:node`,
`npm run test:tabs`. To undo a job: `git checkout claude1` and delete the branch.

---

## Job 1. The 46 `!important` declarations in the CSS

**Goal.** Remove the ones that are no longer needed, so the CSS says what it means. Keep the ones that are.

**Why it is not one step.** Removing all 26 in `parameterControls.css` at once changed 8 screens (the Draw sliders and the
Figures strip). So each group has to be tried alone.

**The declarations, by group** (line numbers are in the files today):

| Group | File and lines | What it does | Expected |
|---|---|---|---|
| A | `css/tabs.css` 306-317 | Top tabs: no border, no outline, no shadow | Written to beat Bootstrap, which is gone. Removing `box-shadow: none` brings back the active-tab shadow defined at `.nav-link.active` (about line 114). **Your call:** shadow or no shadow |
| B | `css/tabs.css` 344-346, 359, 385-387, 396, 403 | Gallery and Utilities subtabs: idle tab colours | Likely removable. Look at odd and even tabs, hover |
| C | `css/parameterControls.css` 32, 70, 114-116, 123-126, 132-134, 151, 257 | Colours, borders and sizes of the Draw controls (selects, labels, text boxes, checkboxes, range values) | These changed the 8 screens. Try the lines one rule at a time |
| D | `css/parameterControls.css` 410-429 | The Coloris colour picker's input and button | Probably needed: Coloris adds its own stylesheet at run time. Try last; keep if anything moves |
| E | `css/wrapper.css` 239, 243; `css/categories.css` 72-73 | A disabled caption-menu item; the active list item | Try; check disabled items and the highlighted row |
| F | `css/overlay.css` 181 | `.tox-tooltip` z-index (TinyMCE) | Keep: TinyMCE adds its own CSS |

**Steps, for each group (A first).**
1. `npm run pixels:save -- before` (once, at the start).
2. Delete ` !important` from that group's lines only.
3. Save. The browser reloads by itself. Look at the places in "Look at" below.
4. `npm run pixels:save -- after`, then `npm run pixels:compare -- before after`.
5. If everything is `identical` and your by-hand look is the same: keep, `git commit -m "CSS: drop !important from group X"`.
   If a picture is `DIFFERENT`, open its red-marked copy to see what moved. Put the `!important` back (`git checkout css`) and
   leave a one-line comment above the rule saying what it is fighting.

**Look at, by hand, for each group.**
- A: mouse over each top tab; click through; the active tab with and without a shadow.
- B: Gallery and Utilities subtabs: idle, hover, active; every second tab has a different shade.
- C: Draw > Cycloid, Draw > Parametrics, any Draw object with a colour control, a checkbox and a text box; Figures strip.
- D: click a colour swatch: the picker opens; its text box is hidden; the swatch is 36 x 32 with no text.
- E: a disabled item in a caption menu stays white on hover; a selected row in a category list is dark with white text.

**Done when.** Each group is either removed (committed) or kept with a comment. Update the count in `docs/` and `NEXT_PASS.md`.

---

## Job 2. Show / hide held in state (46 `style.display` lines)

**Goal.** Whether a region is shown is a fact in `uiState`, written when it changes, and one function applies it to the page.
No other code sets `style.display`. This follows your rule: state is written through immediately, and nothing reads the page.

**Where each line is.** `docs/CHECKLIST_sweep-1.md`, section 7: the groups, with what each shows or hides and a check for it.
Do one group per commit, in this order (lowest risk first): `caption.js`, `categories.js`, the two results files,
`thumbnailWidget.js` / `textWidget.js`, `renderer.js`, the three canvas-wrapper lines (`scriptRunner.js`, `drawRunner.js`,
`home.js`), `nextPrevOverlay.js`, `interactor.js` / `canvasLayerManager.js`, `overlay.js` and the help/dialog containers,
`figurePointer.js` / `figures.js`, then `figuresNav.js` last.

**The pattern (copy it for each group).**

1. Add a place in state. In `ui/uiState.js`, inside the existing state object, add `visibility: {}` once.
2. Make one small module, `ui/visibility.js`:
   ```js
   import { uiState } from "/ui/uiState.js";

   // id of the element, and the display value when it is shown
   const TARGETS = {
     captionBar:     { id: "caption",        shown: "flex" },
     figureSidebar:  { id: "figure-sidebar", shown: "flex" },
     // ... one line per thing that can be hidden
   };

   export function setShown(name, shown) {
     uiState.visibility[name] = shown;      // state first
     applyVisibility(name);                 // then the page
   }

   export function applyVisibility(name) {
     const t = TARGETS[name];
     const el = document.getElementById(t.id);
     if (el) el.style.display = uiState.visibility[name] ? t.shown : "none";
   }

   export function applyAllVisibility() {   // call after a rebuild
     for (const name of Object.keys(TARGETS)) {
       if (name in uiState.visibility) applyVisibility(name);
     }
   }
   ```
3. In the file you are converting, replace each `el.style.display = "..."` with `setShown("name", true/false)`. Add the
   name to `TARGETS`. Use the real value that line used ("flex", "block", "grid", ""), as `shown`.
4. Where a region is rebuilt (the places `clearDivs()` empties, or a tab init), call `applyAllVisibility()` so a rebuilt
   region gets its state back. This is the step that makes it more than a rename.
5. `ui/regions.js` already says what `clearDivs()` does to the core regions; leave it alone.

**Check, for each group.** The "Check when converted" column in section 7 of the checklist, then
`npm run pixels:compare -- before after` (should be `identical`), `npm run test:tabs`.

**Undo.** One commit per group, so `git revert` the one that misbehaves.

**A decision to make first.** Is `#categories` / `#drawControls` (see Job 3) part of this? If they become fixed children,
they get entries in `TARGETS` too. Decide Job 3 first.

---

## Job 3. Fixed `#categories` and `#drawControls` in `index.html`

**The situation.** `index.html` is meant to be the one place structure is written. Four things are still created by code:
`canvas#sharedCanvas` (`draw/drawState.js`), `#categories` (`ui/categories.js`), `#drawControls`
(`ui/controls/rendering/renderer.js`), and the popup menus (`ui/menuManager.js`). The reason: `clearDivs()` empties
`#action`, `#text` and `#sketchpad` on every tab change, which would delete a fixed child, so code recreates them each time.

**The design call.** Two ways to make them fixed:

- **Option 1: keep them and empty only their contents.** `index.html` gets `<div id="action"><div id="drawControls"></div></div>`
  and `<div id="text"><div id="categories"></div></div>`. `clearDivs()` stops emptying `#action` and `#text` wholesale; it
  empties the fixed child, and removes any other children. Price: things other tabs append straight into `#action` or `#text`
  now sit after the fixed child, and an empty fixed child must take no space.
- **Option 2: leave it as it is.** Say in `index.html` that these are content wrappers, not regions (already done). Price: the
  "one source of truth" is not literally true for these four.

**To try Option 1** (about an hour): add the two divs, change `clearDivs()` and the table in `ui/regions.js` (add a
`keep: ["drawControls"]` field), change `renderer.js` and `categories.js` to find the element instead of creating it
(fail loudly if missing, as `homeResults.js` now does), remove them from the built-by-code list in `tests/idCheck.mjs`.
Then `pixels:compare`: any `DIFFERENT` in a tab with a list or sliders means the layout order changed. Check by hand: a tab
where both a thumbnail grid and sliders appear (Draw with saved settings), and the Figures strip.

**Recommendation.** Option 2, unless the pictures come back identical.

---

## Job 4. Small ones, each a few minutes

1. **Open in VS Code with a space in the path** (follow-up list item 12). Show Script > Open in VS Code on
   `gallery/Scripts/Curve Stitch/...`. If it fails: in `node/logAndEditorRequests.mjs`, `openInEditor` calls
   `launchDetached(cmd, [full])`. On Windows `launchDetached` runs the command through a shell (`shell: true`), and a shell
   splits an unquoted path at the space. Change that call to
   `launchDetached(cmd, [process.platform === "win32" ? '"' + full + '"' : full])`. The file name was already checked
   (letters, digits, `_ . - / ` and space only), so quoting it is safe. Restart the Node window, try again, then run
   `npm run test:node`.
2. **Active-tab shadow** (Job 1, group A). Decide; the picture for either choice is a one-line change.
3. **Refresh the TinyMCE assets** if a help editor menu misbehaves. In a command prompt in the repo folder:
   the five folders, one command each:
   `robocopy node_modules\tinymce\skins public\tinymce\skins /E`, the same for `icons`, `models`, `plugins` and `themes`.
   Then `npm run test:tabs` and open the help editor. (The program code is
   TinyMCE 8.10.1; `public/tinymce` was copied from 8.3.x in January.)
4. **Script state leak** (`NEXT_PASS.md` 1g). In Patterns, open items one after another in one long session
   (about a hundred) until `patterns/curve_stitch/curvedArcsInnerStar.js` or `patterns/figures/complicatedParabolas.js`
   throws; both work on a fresh page. In the browser console, before and after a run, type
   `JSON.stringify(drawState)` and compare: the field that differs between a fresh page and a late run is the leak. Report
   the field; the fix is to reset it in `resetCanvas()` in `draw/drawState.js`.
5. **Manifest phase** (`maintain_manifests.mjs` guard). The last lines of the file are an unguarded `runManifestMaintenance().then(...).catch(... process.exit(1))`, so
   importing the file (which the Node service does) runs the whole rebuild. Wrap that call in
   `if (import.meta.url === pathToFileURL(process.argv[1]).href) { ... }` and add `import { pathToFileURL } from "node:url";`
   at the top. Then confirm `sketchpad.bat` still rebuilds manifests once at start.

---

## Job 5. Things that need a design conversation first

These are not instructions yet. Read `claude/NEXT_PASS.md` (1a, phase items) and `claude/DESIGN_composed-figures.md`
(ownership of points, controls through the weld path, welding to templates). Write down your answers to the questions in
that file, and the instructions for each phase item can be written from them.
