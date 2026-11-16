# Checklist: what to check by hand on `claude/tier-a` (and `claude/codespaces`)

Each item is also a line on Home > Checklist, where you tick it. Each says what to do and what failure looks like.
Undo for any item: `git revert` the commit named.

**Setup.** `git fetch`, `git checkout claude/tier-a`, `npm install`, restart Vite and the Node service
(`sketchpad.bat`).

**T1. Shapers and connectors** (a8f4411). `npm run test:shapers`: "20 shaper and connector tests passed". Read
`draw/shapers.js` and `draw/connectors.js`: each function has a block comment, and the header lists them
alphabetically. Nothing uses them yet except the tests; the Ideabook routines are yours to rewire. Failure: a test
fails, or a function you can't follow. Tell me which.

**T2. Step through the drawing** (50b9521). Draw > Cycloid > caption menu v > **Step through the drawing**. The left
column shows `|<  <  >  >|`, a slider and "Line N of N: (x, y) to (x, y), colour". The last line is red. Press `|<`:
only line 1 shows, in red, with a dot at its start. Press `>` a few times, drag the slider, move a Cycloid slider:
the drawing changes and stepping carries on. **Done stepping** draws everything again. Switch tabs while stepping and
come back: stepping has ended. Failure: lines missing after Done; the readout not matching the red line.

**T3. Errors as a checklist** (19e56b3, then the Show all and Purge change). Make an error: F12 console,
`setTimeout(() => { throw new Error("probe") }, 0)`. The red bar lists it with a **Tick** button. Tick it: it leaves
the bar. Make it again and reload: Home's yellow bar says "1 error is not yet ticked". Home > **Errors**: it's listed
with a checkbox. Tick it: it goes. Tick **Show all**: it's back, greyed and ticked. **Purge ticked**, then OK: it's gone
even with Show all. `utilities/logfiles/errors_<today>.txt` still has every line, plus "Acknowledged:" and "Purged:"
lines. Failure: an error that reappears after a tick without happening again.

**T4. Home > Notes** (19e56b3). Shows `home/notes.md`. **Open in VS Code** opens it. Edit and save, then **Reload**:
the new text shows.

**T5. Home > Checklist.** This list. Tick an item: it goes. **Show all**: ticked items show greyed; untick one and it's
back. Type in the box and **Add item** (or press Enter): it's added at the end. **Purge ticked**, then OK: ticked lines
are removed from `home/checklist.md`. Open the file in VS Code: it's a plain Markdown task list, and you can edit it
there too.

**C1. A Codespace from the iPad** (claude/codespaces). On github.com, open the repository, choose the branch, then
Code > Codespaces > Create codespace. Wait for setup: it runs `npm install`, then `npm run dev:all`. Open port 5173
(Ports panel, or the pop-up). Sketchpad opens. Draw works. Figures > Save As works (it uses the Node service), and the
error log is written. Stop the Codespace when done (github.com/codespaces). Failure: "The Node service did not answer";
tell me what the terminal shows.

**C2. The PC after the Codespaces change.** Start as usual. Save a figure, Utilities > Show Logs, Regenerate
thumbnails: all still work. Failure: "did not answer" messages while the Node service window is running.

**T6. Inches and one-sheet SVG** (de9b798). Figures: a figure with discs. Caption menu: **Print size...** asks in inches
(type 8). **Nail size...** asks in inches; a new figure shows clearance 0.187 (3/16). **Print units: inches (switch)**
changes the questions to millimetres. **Save template as one SVG...**: answer OK for colours. A file downloads; open it
in a browser or Inkscape: nails in red, green, orange, blue, yellow in turn, and a 100 mm line at the top. Print it at
actual size and measure the line. Cancel instead gives black nails. **Print template...** still gives sheets. Failure:
wrong size; the line isn't 100 mm.

**T7. Sweep over two settings.** Draw > Cycloid > Sweep a setting... Choose a second setting with 2 pictures: a grid,
first setting across and second down, each labelled with both values. Click one: both sliders take its values. Type
"3, 5, 8" in a list box: those values are used instead of From and To.

**T8. Regression report views.** After any intended drawing change, `npm run test:regression`, then open
`tests/regression/report.html` (through Vite: http://localhost:5173/tests/regression/report.html). Each change shows
approved, now, an overlay (blue approved, red now, black where they agree), a flicker picture (click to start and stop)
and a difference picture (changed pixels in red). An item that legitimately varies a little can get its own allowance
in `tests/regression/tolerance.json`.

**T9. Function dictionary.** `npm run dictionary`, then open `docs/FUNCTIONS.md`: every function alphabetically, with
file:line and a line about it. "(no comment)" marks the functions still owed a block comment.

**T10. Controls by name alone.** `npm run test:controls`: 6 pass. Read `ui/controls/builders/conventions.js`. In a
script, `controls: { lineWidth: true, style: "group" }` gives a line-width slider and colour, line width and
transparency, with no further definition. Nothing existing changed (the regression test passes).

**T11. Intersections mark.** Figures: two crossing lines, Points Mode. The crossing is a purple ring with a cross;
middles are still open black diamonds. Clicking either still places a disc there.

**T12. Layer order.** Figures with three layers: click layer 1; it's drawn on top. Click layer 2; layer 2 is drawn on top
and layer 1 drops back to where it was. Choose layer 1, caption menu **Keep this layer on top**, then click layer 2:
layer 1 stays above the others below layer 2. Save and reopen: the kept order is saved; clicks never changed the file.

**T13. Clipping shapers.** `npm run test:shapers`: 22 pass. `inside(points, shape)` keeps the points inside a closed
shape, and `outside` those outside, for nails within a boundary or a hole in a pattern.

**T14. The deferred list.** `docs/TIERS.md` section 5 lists what wasn't built and what each item needs from you.

## 4 November, later

**H. Home > Help** (d62487e). Home > **Help**: contents tree left, page right. Three groups with counts. **Design** is the
Help browser's Overview, by subfolder. **Reflections** are your own topics, by title: **New reflection...** asks for a
title, creates `help/Reflections/<title>.html` and opens the help editor (the one the Help browser uses); **Edit**
edits a chosen reflection (greyed for the other groups). **Build Documents** are the docs/ documents A to Z: Markdown
converted to HTML, PDFs shown in a frame (not copied: they stay in docs/). After a docs/ change run
`npm run help:builddocs`. The Help browser shows the two new folders too. Failure: a group empty while the Node
service is running; an unformatted Markdown page; a reflection not listed after it was made.

**L. Lists from the folders** (0eb4a8e, d47f9a0). Every list (Patterns, Gallery, Utilities, Figures, Draw saved settings)
and the Home list come from the files in the folders (`node/libraryIndex.mjs`). manifest.json files are now only notes:
titles, statuses, order. Checks: the lists look as before (they were compared item by item and are identical); a new
file appears on reload without a manifest edit; a removed file leaves without breaking anything; Edit Manifest, Save
figure and Archive still work; `sketchpad.bat` no longer runs the manifest maintenance at start-up (Rebuild & Validate
still does). Failure: a category or item missing; a status not shown on Home. Undo: `git revert d47f9a0 0eb4a8e`.

**K. Comments** (1e9a6be). A comment above every function (299 added, comments only). `npm run dictionary` lists them in
`docs/FUNCTIONS.md`. Read a few files you know and tell me any comment that is wrong or unclear.


**O. Help Overview** (04efbad). Six pages have a "Changes, 3 to 5 November 2026" section at the top; four older pages
(dataFlow, sketchpadArchitecture, fileLayer, gallery) have a note that lists now come from the folders. Seven new pages
under Subsystems. Tell me anything wrong or missing.

## 5 November

**Checklist rewritten.** `home/checklist.md` was reviewed and rewritten by area (setting up, tabs, Home, Help, errors,
lists, Draw, curve library, Figures, scripts, Codespace, tests, reading, decisions), about 150 checks. Older ids (F, E, I,
T, H, L, K, O, C) are kept where the check is the same, so the details here and in the older checklists still apply.

**P. Curve library and shape palette** (76f3986). Twelve new Draw objects in two new categories: curves (Rose, Lissajous,
Epicycloid, Hypocycloid, Astroid, Cardioid, Limacon, Superellipse, Archimedean Spiral) and shapes (Rectangle, Polygon,
Ellipse). Each has a centre handle (moves it) and a size handle (resizes it; the Size slider follows, and moving the
slider moves the handle), Points, Stitch (Outline, Chords with Skip, Times table with Factor, All pairs), colour and line
width, and its own setting. In Figures: Rectangle, Polygon and Ellipse buttons in the caption beside Line and Parabola,
and a Curve... list; discs sit on any of a curve's points, and weld like any other disc. Names, including the three
ambiguous ones (polygon, ellipse, archimedeanSpiral), are in `docs/registryNames.md`. Run Regenerate thumbnails for Draw
once to give them pictures. Failure: an object that draws nothing at its defaults; a size handle that does not resize;
discs that do not follow the curve. Undo: `git revert 76f3986`.

**5 November, later.** The explicit, step-by-step version of every check, with pictures, is docs/CHECKING_GUIDE.md (Home > Help > Build Documents > Checking guide).

**Start-up port check** (f055db9, 16 November). `npm run check:ports` now runs first and stops the start if port 5173 or 5174 is already in use (before, `predev` ran it beside the servers with a single `&`, which could not stop anything). The Node service also exits with a plain message if its own port is taken. Checked on Linux only (busy and free ports, exit codes, the `&&` chain); the Windows launch through `sketchpad.bat` is what SP1 to SP4 cover. Failure: the second window keeps going instead of stopping; the first Sketchpad stops working when the second is started; a stray `node` still holds 5174 after you close the window (that case is not fixed: end it in Task Manager). Undo: `git revert f055db9`.
