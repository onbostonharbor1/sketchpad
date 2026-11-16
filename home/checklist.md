# Things to check

Shown on Home > Checklist, where each line has a checkbox. Each id (S1, HM2, P12 ...) has exact steps, what you should
see, and pictures in the **Checking guide**: Home > Help > Build Documents > Checking guide (docs/CHECKING_GUIDE.md),
under the same section number. Open the guide beside this list. If something does not match, Add item here saying what
you saw, and tell me.

## 0. Setting up
- [ ] S1 git fetch, git checkout claude/tier-a, git pull; npm install
- [ ] S2 Stop any running Vite; start with sketchpad.bat. No "Starting Sketchpad Maintenance" step (the manifest rebuild no longer runs at start-up)
- [ ] S3 The app opens on Home with no red error bar
- [ ] S4 Utilities > Tools > Thumbnails > Regenerate thumbnails, Draw: the new curve and shape objects get pictures (26 Draw pictures in all)

## 1. Every tab still works
- [ ] A1 Click each main tab twice in turn (Home, Draw, Patterns, Figures, Gallery, Utilities): each shows what it showed before
- [ ] A2 Open an object in Draw, switch to another tab and back: the same object and settings are showing
- [ ] A3 Open a pattern in Patterns, switch away and back: the same pattern is showing
- [ ] A4 The Commands button on each tab opens that tab's Maintenance panel; the X closes it
- [ ] A5 The ? (Help) on a tab opens the Help browser; its tree now also has BuildDocs and Reflections

## 2. Home
- [ ] HM1 Home subtabs read: Categories, Errors, Checklist, Help, Notes (Results appears when an item is open)
- [ ] HM2 Categories: one frame per status (Queue, fix, Examine, favorite, new ...), the same items as before
- [ ] HM3 Click a script item in Categories: it runs in Results; Prev and Next step through its status group
- [ ] HM4 Click a picture item: it shows in Results
- [ ] HM5 Click a Draw object item (if any have a status): the Draw tab opens on it
- [ ] HM6 The yellow alert bar appears only when there are unticked errors or a manifest check found problems; Dismiss hides it
- [ ] T4 Notes: shows home/notes.md; Open in VS Code opens it; edit, save, Reload shows the change (guide)
- [ ] T5 Checklist: this list. Tick an item: it goes. Show all: ticked items greyed; untick one: it comes back (guide)
- [ ] T5a Checklist: type in the box and press Add item (or Enter): the new line appears at the end of home/checklist.md
- [ ] T5b Checklist: Purge ticked asks first, then removes only the ticked lines; headings stay
- [ ] T5c Open home/checklist.md in VS Code: plain "- [ ]" lines; an edit there shows after switching subtabs

## 3. Home > Help
- [ ] H1 Help shows a contents tree on the left and a page on the right (guide)
- [ ] H2 Three groups with counts: Design, Reflections, Build Documents
- [ ] H3 Design holds the Overview pages by subfolder (Design Notes, Subsystems, Tabs); open one: it shows on the right
- [ ] H4 Build Documents lists the docs/ documents A to Z (27, including registryNames)
- [ ] H5 Open TIERS under Build Documents: headings, tables and lists are formatted, not raw Markdown
- [ ] H6 Open a specification PDF under Build Documents: the PDF shows in the page; Open the PDF on its own opens it in a browser tab
- [ ] H7 New reflection: asks for a title, then opens the help editor on the new page
- [ ] H8 Type in the editor and Save: the text is kept; close the overlay; the reflection is listed by its title under Reflections
- [ ] H9 Choose a reflection and press Edit: the editor opens with its text; Save keeps the change
- [ ] H10 Edit is greyed for Design and Build Documents pages
- [ ] H11 New reflection with the title of an existing one: refused with a message
- [ ] H12 Change a docs/ file, run npm run help:builddocs, open it again: Build Documents shows the change
- [ ] H13 Open registryNames under Build Documents: the twelve new names, with the three ambiguous ones explained

## 4. Errors
- [ ] E1 Error bar (docs/CHECKLIST_v1-errors.md)
- [ ] E2 Error log: Utilities > Tools > Show Logs lists Error logs first (docs/CHECKLIST_v1-errors.md)
- [ ] E3 Start-up summary on Home (docs/CHECKLIST_v1-errors.md)
- [ ] E4 A failing figure layer is named in the bar and the other layers still draw (docs/CHECKLIST_v1-errors.md)
- [ ] E5 Utilities > Tools > Validate Draw Registry: every object OK except Linked Circles (known), including the 12 new ones
- [ ] E6 Utilities > Tools > Check Figure Files: one line per saved figure (docs/CHECKLIST_v1-errors.md)
- [ ] T3 Make an error (F12 console: setTimeout(() => { throw new Error("probe") }, 0)): the red bar lists it with Tick (guide)
- [ ] T3a Tick it in the bar: it leaves the bar; utilities/logfiles/errors_<today>.txt has an "Acknowledged:" line
- [ ] T3b Make the same error again and reload: Home's yellow bar says 1 error is not yet ticked
- [ ] T3c Home > Errors lists it with a checkbox; tick it: it goes
- [ ] T3d Show all: it is back, greyed and ticked; Purge ticked, OK: it is gone even with Show all; the log still has every line plus "Purged:"

## 5. Lists from the folders (manifests are only notes now)
- [ ] L1 Patterns, Gallery (Ideabook, Patterns, Scripts), Utilities (Tools, Lab) and Figures lists look exactly as before (guide)
- [ ] L1a Draw > Categories now also shows the categories curves and shapes; an object with saved settings is still marked as such, and only those
- [ ] L2 Home > Categories shows the same statuses and items as before
- [ ] L3 In VS Code add a new .js file to a patterns category folder (no manifest edit); reload: it appears, titled by its file name
- [ ] L4 Move that file out again; reload: it is gone and nothing breaks
- [ ] L4a Add a picture to an Ideabook folder without touching its manifest; reload: it appears in that category
- [ ] L5 Edit Manifest on a pattern (title or status): the new title shows; a new status shows on Home
- [ ] L6 Save a figure (new category too): Figures > Categories lists it
- [ ] L7 Archive an item: it leaves its list and its file is in the archive folder
- [ ] L8 Utilities > Rebuild & Validate still runs and reports
- [ ] L9 Gallery Prev and Next keep the same order as before

## 6. Draw
- [ ] D1 Every Draw object opens and draws (Draw > Categories, each one in turn)
- [ ] D2 Handles drag; a pressed handle nudges with the arrow keys (1 px, 10 with Shift)
- [ ] D3 Sliders, colour pickers and the Stitch list redraw at once
- [ ] D4 Caption menu: Save as PNG, Save as Pattern, Copy Object, Reset Parameters each still work
- [ ] D5 Saved settings (secondary objects) open from the category frame and save
- [ ] T2 Step through the drawing (Draw > Cycloid > caption menu): left column shows first, previous, next, last, slider and "Line N of N" (guide)
- [ ] T2a Stepping: first shows only line 1 in red with a dot at its start; next and the slider step on; the readout matches the red line
- [ ] T2b Stepping: move a Cycloid slider while stepping: the drawing changes and stepping carries on
- [ ] T2c Stepping: Done stepping draws everything again; a tab switch while stepping ends it
- [ ] F9 Sweep a setting: a grid of pictures over one setting; click one to use it (docs/CHECKLIST_v1-finish.md)
- [ ] T7 Sweep with a second setting: a grid, first setting across, second down, each labelled with both values; click one: both sliders take its values
- [ ] T7a Sweep: type "3, 5, 8" in a list box: those values are used instead of From and To

## 7. Curve library and shape palette (new)
- [ ] P1 Draw > Categories has a curves frame (9) and a shapes frame (3) (guide)
- [ ] P2 Rose: Petals (k) changes the petal count (k odd: k petals, even: 2k)
- [ ] P3 Lissajous: a, b and Phase change the figure (3 and 2: a pretzel)
- [ ] P4 Epicycloid: Lobes changes the number of cusps outside
- [ ] P5 Hypocycloid: Cusps 3 a deltoid, 4 an astroid, more a star
- [ ] P6 Astroid and Cardioid draw (no setting of their own)
- [ ] P7 Limacon: Loop below 1 an oval, 1 a heart, above 1 a loop inside a loop
- [ ] P8 Superellipse: Power 2 a circle, 4 a squircle, 1 a diamond, below 1 a star
- [ ] P9 Archimedean Spiral: Turns changes the turns; the outline is not closed
- [ ] P10 Rectangle: Height / width changes its shape; Polygon: Sides changes the sides; Ellipse: Height / width
- [ ] P11 Every one: drag the centre handle: the whole object moves
- [ ] P12 Every one: drag the size handle (it starts to the right): the object resizes and the Size slider follows
- [ ] P13 Every one: move the Size slider: the size handle moves with it
- [ ] P14 Every one: Points changes how many points (3 to 400)
- [ ] P15 Stitch: Outline joins each point to the next; Chords uses Skip; Times table uses Factor (negative and fractional too); All pairs joins every pair
- [ ] P16 Odd settings draw something odd rather than nothing (rose k 0, superellipse power 0.2, polygon 3 points)
- [ ] P17 Final mode shows just the points of a curve
- [ ] P18 Figures caption has Rectangle, Polygon, Ellipse buttons beside Line and Parabola, and a Curve... list of the 9 curves
- [ ] P19 Insert a rectangle, a polygon, an ellipse and a rose from the caption: four layers, each drawn
- [ ] P20 Points Mode on a curve layer: clicking near the curve puts a disc on one of its points; the disc rides along when the curve is moved or resized
- [ ] P21 Weld a disc on a rose to a disc on a polygon (drop a handle on a handle, or as before): the weld mark shows
- [ ] P22 Points Mode turns the palette buttons and the Curve list grey
- [ ] P23 A figure of curves prints: Print size, then Print template, nails on the curve points
- [ ] P24 Save a figure with curve layers and reopen it: the curves and their settings are as left
- [ ] P25 Draw > Rose > Save as Pattern: the pattern runs in Patterns
- [ ] P26 Read draw/curves.js and draw/ringObject.js, and one registry file (drawRegistry/rose.js): plain enough to follow?

## 8. Figures
- [ ] F1 Figure files: Save As writes format 1 with lid, objectVersion, role (docs/CHECKLIST_v1-finish.md)
- [ ] F2 Settings stay private between Draw, Figures and Patterns (docs/CHECKLIST_v1-finish.md)
- [ ] F4 Magic points: diamonds at middles, tips, cusps (docs/CHECKLIST_v1-finish.md)
- [ ] T11 Two crossing lines in Points Mode: the crossing is a purple ring with a cross; middles are black diamonds; clicking either places a disc there
- [ ] F5 Print aids: print size, scale bar, spacing check (docs/CHECKLIST_v1-finish.md)
- [ ] T6 Print size... asks in inches; type 8: the nails span 8 inches (guide)
- [ ] T6a Nail size... asks in inches; a new figure shows clearance 0.187 (3/16)
- [ ] T6b Print units: inches (switch) changes the questions to millimetres and back
- [ ] T6c Save template as one SVG..., OK for colours: the file's nails are red, green, orange, blue, yellow in turn; Cancel gives black
- [ ] T6d Print the one-sheet SVG at actual size: the line at the top measures 100 mm
- [ ] T6e Print template... still gives sheets with a cover page; the cover gives nail sizes in mm and inches
- [ ] T6f Show nail spacing problems rings close pairs, and printing still works with problems present
- [ ] F6 Templates as guide layers (docs/CHECKLIST_v1-finish.md)
- [ ] F7 Break apart Inverse Star (docs/CHECKLIST_v1-finish.md)
- [ ] F8 Parametrics centre and size handles (docs/CHECKLIST_v1-finish.md)
- [ ] F10 Insert by picture (docs/CHECKLIST_v1-finish.md)
- [ ] F11 Pursuit (temp) centre handle (docs/CHECKLIST_v1-finish.md)
- [ ] T12 Click layer 1: drawn on top; click layer 2: layer 2 on top and layer 1 drops back
- [ ] T12a Choose layer 1, caption menu Keep this layer on top, click layer 2: layer 1 stays above the rest below layer 2
- [ ] T12b Save and reopen: the kept order is saved; clicks alone never changed the file
- [ ] FG1 Welds: a handle dropped on another handle welds; moving one moves the other; a weld whose members no longer meet shows red
- [ ] FG2 Delete layer, Copy, Reset and Archive in the caption menu still work
- [ ] FG3 Move and rotate a layer by its centroid and bounding box

## 9. Patterns, Gallery and Utilities
- [ ] F3 Scripts run in any order (docs/CHECKLIST_v1-finish.md)
- [ ] E7 Script history: open a script, caption menu > Script history: versions listed, Run and Compare work (docs/CHECKLIST_v1-errors.md)
- [ ] I1 Ideabook: open an image, Run script beside Prev and Next runs its hint (docs/CHECKLIST_ideabook-scripts.md)
- [ ] I2 The hints: spot-check a few in each Ideabook folder (docs/CHECKLIST_ideabook-scripts.md)
- [ ] I3 The shared routines (docs/CHECKLIST_ideabook-scripts.md)
- [ ] I4 The pursuit engine (docs/CHECKLIST_ideabook-scripts.md)
- [ ] G1 Thumbnails show in the category frames; Thumbnails on or off, and size, still work
- [ ] G2 Check Missing Images lists only items with no picture
- [ ] F12 The survey of what scripts rely on (docs/CHECKLIST_v1-finish.md)

## 10. Codespace (the iPad)
- [ ] C1 On github.com: the repository, branch claude/tier-a, Code > Codespaces > Create codespace; it installs and starts by itself (guide)
- [ ] C1a Open port 5173 (Ports panel or the pop-up): Sketchpad opens
- [ ] C1b In the Codespace: Draw works, and Figures > Save As works (it needs the Node service)
- [ ] C1c In the Codespace: the lists are the same as on the PC, and Home > Help opens
- [ ] C1d Commit and push anything made in the Codespace; stop the Codespace when done (github.com/codespaces)
- [ ] C2 Back on the PC: saving, Show Logs and Regenerate thumbnails still work (no "did not answer" while the Node service runs)

## 11. Tests to run on the PC (each should end in PASS or 0 failed)
- [ ] R1 npm run test:tabs
- [ ] R2 npm run test:regression; then open tests/regression/report.html through Vite (http://localhost:5173/tests/regression/report.html) if anything changed
- [ ] R3 npm run test:errors
- [ ] R4 npm run test:node
- [ ] R5 npm run test:history
- [ ] R6 npm run test:ideabook
- [ ] R7 npm run test:shapers (27 tests) and npm run test:controls (6 tests)
- [ ] R8 npm run lint:globals: 0 errors
- [ ] T8 After an intended drawing change, the regression report shows approved, now, overlay, flicker and difference (guide)
- [ ] F13 The regression test itself (docs/CHECKLIST_v1-finish.md)

## 12. Reading
- [ ] O1 Help Overview: the "Changes, November 2026" sections at the top of Home, Draw, Figures, manifest, nodeLayer and Parameter Controls
- [ ] O2 Help Overview > Subsystems: the eight new pages (lists from the folders, errors and checklists, stepping, shapers and connectors, Home Help, Codespaces, tests, curve library and shape palette)
- [ ] T1 draw/shapers.js and draw/connectors.js: each function clear on its own (guide)
- [ ] T10 ui/controls/builders/conventions.js: controls by name alone and groups
- [ ] K1 Open three files you know (draw/drawRegular.js, ui/setUI.js, ui/home/home.js): each function has a comment saying what it does
- [ ] K2 npm run dictionary; docs/FUNCTIONS.md lists every function A to Z (780, 1 without a comment)
- [ ] K3 Note any comment that is wrong or unclear (Add item here), and I will fix it
- [ ] T9 docs/TIERS.md sections 5 to 8: what was built, what is deferred and why

## 13. Decisions still yours
- [ ] Q1 Undo, crash recovery and stepping in Figures are next, before the next tier: say go when ready
- [ ] Q2 The Ideabook routines and the old stitcher: move them onto shapers and connectors, or leave them?
- [ ] Q3 Core / keeper / test tags on Draw objects: want them or drop the idea?
- [ ] Q4 Templates beyond guide layers, draggable alignment marks, the simplified-curve overlay, the settings page: each needs your spec
- [ ] Q5 Merge claude/tier-a into claude1 when satisfied (tell me; I fast-forward)
- [ ] Q6 Delete the leftover branches on GitHub: claude/hopeful-dirac-iirr6d, claude/codespaces (after the merge), and the three old V1 branches

## 14. Added 6 November: stepping in Figures, intersections, time limit
- [ ] N1 Figures: a figure with two layers, caption menu v > Step through the drawing: the stepping controls in the left column, the readout names the layer (guide)
- [ ] N2 Stepping in Figures: |< shows only line 1 of the bottom layer; > and the slider step through the bottom layer, then the next
- [ ] N3 Stepping in Figures: tick Active layer only: only the active layer is stepped, the other layers are drawn in full
- [ ] N4 Stepping in Figures: Done stepping draws everything; a tab switch ends stepping
- [ ] N5 Parametrics: tick Show intersections: the red marks appear where they did before, and quickly even with many points
- [ ] N6 Parametrics with the most points it allows and Show intersections: draws in about a second or less, no freeze
- [ ] N7 Figures, Points Mode: crossing marks (purple ring with a cross) appear where lines and curves cross, as before
- [ ] N8 npm run test:intersections: 11 tests passed, including "20,000 points: ... crossings in ... ms"
- [ ] N9 Time limit: Draw > Rose, Points 400, Stitch All pairs: draws (well under 2 s), no message
- [ ] N10 Time limit: F12 console, run the line in the guide (a deliberately endless drawing): within about 2 s the red bar says "Drawing stopped ... ran longer than 2 s"; the page still works
- [ ] N11 Time limit: patterns and gallery scripts you know run as before, none stopped
- [ ] N12 Read Help > Design > Subsystems: Intersections, The time limit on drawings, and the Figures part of Stepping through a drawing

## 15. Added 6 November: tutorials and the help PDF
- [ ] U1 Home > Help shows a fourth group, Tutorials (22), in order 01 to 22 (guide)
- [ ] U2 Open a tutorial: each section has Read, What happens, Watch it and Try
- [ ] U3 Pick one tutorial and do its Watch it and Try steps; note anything that does not match the code (Add item)
- [ ] U4 npm run help:pdf -- C:\Users\barry\Desktop\Sketchpad-Help.pdf (with sketchpad.bat running) makes the PDF; open it: cover, contents, four parts

## Combinations (6 November)
- [ ] CB1 Gallery > Scripts > Combinations > Framed Alternating Shapes: shapes inside a slant frame
- [ ] CB2 Controls for: Shapes shows the shapes' sliders, Frame the frame's; a slider in each changes only its own part
- [ ] CB3 Drag a shapes handle in the combination; then open Curve Stitch > Alternating Shapes: it is unchanged
- [ ] CB4 Home > Help > Overview > Combinations reads clearly; gallery/Scripts/Combinations/combinable.md lists 6 scripts that can be combined

## Start-up port check (16 November)
- [ ] SP1 Start Sketchpad with sketchpad.bat as usual: it opens and works (nothing changed when no other copy is running)
- [ ] SP2 With it running, double-click sketchpad.bat again: the second window says a port is in use (5173 and 5174) and stops; the first Sketchpad is unaffected
- [ ] SP3 With only the Node service left running (close the Vite window), run sketchpad.bat: the check names port 5174 and stops
- [ ] SP4 Close the first Sketchpad's window the way you normally do, then start again: it starts; if it says a port is busy, find the stray node in Task Manager and note how you closed the window (Add item)
