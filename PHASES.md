# Sketchpad phases

Barry's numbered list is the authority. It replaces the older "slice" numbering in the spec doc.
Do one phase at a time. After each, stop and wait for him to review, play with it and say go.

| Phase | What | Status |
|---|---|---|
| 1 | Tests and safe fixes | Done, merged |
| 2 | Hygiene | Done, merged |
| 3 | Help and script viewing (the Notes popup only) | Done, merged |
| 4 | Draw prerequisites: final flag, `drawLine` routing | Done, merged |
| 5 | Figures shell: Create Figure, Untitled N subtabs, caption menu | Done, merged |
| 6a | Insert objects (see below) | Done, merged |
| 6b | Points mode: click-to-place numbered points (anchored or free), global `nextPoint`, numbers toggle in line mode, final display in points mode, a "Hit radius" subcommand (default 5 px) for tuning. Model below | Done, on `claude/phase-6b`, awaiting his review |
| 6c | Layer colors: each layer has a color, shown on its number in the strip and changeable there; that layer's numbered points are drawn as circled numbers in the same color. Retire the old coded-number display (printCircNum and `drawState.ctr`), which only existed to name join points when numbers were coded by hand | Added by Barry; placed after 6b, can move |
| 7 | Handle and drag: arrow-key nudging, 1 px, 10 px with Shift; drag a numbered point; nudge a point's number label | |
| 7b | Centroid and bounding box: every object has a visible centroid. Drag the centroid to move the object anywhere. Selecting a centroid shows a bounding box; grabbing handles on the box rotates the object about the centroid. Open: one handle or several on the box | |
| 8 | Welds | |
| 8b | Magic points: more candidate kinds (midpoints, tops of loops, cusps), needed as weld targets and for parametric objects | |
| 9 | Print aids: scale bar; minimum nail-spacing check (needs nail size and highlight-vs-list answers from Barry) | |
| 10 | Save and recovery (Save As, category and manifest creation, reload) | |
| 11 | Figure follow-ups | |
| 12 | Thumbnails (the Insert list becomes icons with a larger preview on mouseover) | |
| 13 | Sweep tool | |
| 14 | Filesystem boundary refactor (C3) | |

Barry's "Deferred" and "Dropped" lists belong here too. Paste them in from his original list; they are not
reproduced above.

## Phase 6b as built

- Left column: Show All, Points Mode, Numbers, Insert Object. Points Mode shows only points (it sets
  `drawState.final` while the layers draw) and turns the mouse over to `figurePointer.js`.
- Click on a numbered marker selects it (reach is the larger of the hit radius and the 9 px marker). Click within
  the hit radius of an infrastructure point makes an anchored point. Click anywhere else makes a free point.
  Drag moves a point (anchored points slide along their arm). Delete or Backspace, or "Delete selected point" in
  the caption menu, removes it. Numbers are never reused.
- Anchored points keep their exact fraction along the arm when the step count or the object changes.
- Numbers (left button) draws the numbered points over the lines in line mode.
- Caption menu "Hit radius (N px)..." sets `uiState.figures.hitRadius` (default 5; one value for now, not saved).
- Line and Parabola define `infrastructure()`; other registry objects have none yet, so on them only free points.
- Files: `figurePoints.js` (data, picking, drawing), `figurePointer.js` (mouse, keyboard).

## Phase 6a as built

- Insert Object list in the left command area (figure tabs only); Create Figure only on Categories.
- Line and Parabola buttons centered in the gray caption bar, with the active layer's name and a Show checkbox.
- Layer numbers in the gray strip left of the canvas. Clicking a number selects the layer and moves it to the
  top (`figure.drawOrder`; switch `MOVE_TO_FRONT_ON_SELECT` in `figureLayers.js`). Numbers never change.
- Layers other than the active one are dimmed (20%) while editing.
- Same-type inserts are offset 20 px per earlier copy.
- Show All (left, under the Commands button) previews every layer at full strength, hidden ones included. Not saved.
- Hiding a layer is an editing aid only. The final drawing always shows everything, except future guide layers
  (kind `template`).

## Work list for the end, in order

1. Check Coloris (third-party HSV colour control).
2. Update `validateDrawRegistry` once the JSON structure is robust.
3. Cycloid radius control does not work in the app; recheck.
4. Simplify tab activation (Home `saved` = null, await the launch-intent `setUI`, remove dead commented blocks
   and the `LAST_TAB_KEY` write).
5. Utilities: redisplay the last result when returning to the tab.
6. One restore shape: delete dead save/restore code, document one convention. Do it after item 5. Do not make
   Draw and Utilities restore without live testing.
7. Figure templates: ready-made guide shapes (rectangles, circles) inserted as `template` layers, excluded from
   Show All and the final drawing. Includes a temporary ruler drawn between any two places, to measure where a
   point should go. Design with Barry first.
8. Utilities command that sets a global hit radius. A figure always opens with the global value. Optional; drop
   it if unused.
9. HTML help files. Always the very last item, after anything added later. Ask which pages to write.

## Point model (Phase 6b onward; Barry's design)

- Points are created only in points mode, by clicking. Never automatic. Hit radius is 5 canvas pixels (a
  constant in the state object; the setting command is item 8 of the end list).
- Numbers come from `figure.nextPoint`, stick to their point forever, and are never reused, even after delete.
- Two kinds of lines: infrastructure lines (the skeleton of an object) and stitch lines drawn between points on
  the infrastructure. Numbers can only go on infrastructure points. Stitch lines cannot be numbered.
- Anchored point: sits on an infrastructure line at a fraction t of its length. It follows its object.
  When the step count changes, the point always keeps its exact percentage along the line (no snapping,
  increase or decrease), so it may no longer sit on a stitch endpoint.
- Free point: an arbitrary place on the canvas, tied to nothing. Barry drags it to where it belongs.
- A click in points mode takes the nearest candidate (an infrastructure point) within the hit radius. A click
  outside every hit radius, on empty canvas, makes a free point. No modifier key.
- In points mode only points are draggable; object handles are off.
- A point can be dragged and deleted. Near points are not welded; only an explicit weld (Phase 8) makes
  two points one.
- A point's label can be nudged slightly without moving the point (offset stored with the point; Phase 7).
- A free point belongs to a layer: the topmost layer (`drawOrder[0]`) when it was clicked. It does not follow
  that layer, but it takes the layer's color (6c). Point circles may be filled with the layer color.
- Registry objects must say which of their lines are infrastructure. 6b covers Line and Parabola only.

## Vocabulary

- **Drag circle**: the small unnumbered circle on a layer that can be dragged (the red dots on the active
  object). Not to be confused with a numbered point.
- **Numbered point**: a numbered, filled circle; anchored or free (see the point model).
- **Infrastructure line**: a line that carries drag circles and numbered points. Stitch lines do not.
- **Centroid**: the visible center of an object (Phase 7b).

## Drag circle rules (Barry)

- A drag circle tied to a point on an infrastructure line stays at that point. It can be deleted, or it can move
  to follow changes in the line (staying proportional), e.g. a middle drag circle stays in the middle when the
  line gets longer or shorter.
- A free drag circle moves only when dragged. It can be deleted.
- Attachment between objects: both ends of the green parabola in his example follow the blue object when it is
  rotated or enlarged. Rules are needed for what happens when the blue object gets more or fewer sides or
  end points, so that an attached end still has a place to stay. Formalize before Phase 8.

## Open design questions

- 6c: is the number display he calls no longer needed the old coded numbers (printCircNum, `drawState.ctr`), the
  Numbers button, or both?
- 7b: how to rotate. Option A: every layer gets a transform (move, rotate, later scale) applied around its
  centroid when it draws, so all objects work without changes; the cost is that drag circles and infrastructure
  positions must be mapped through the same transform. Option B: rewrite each object's own params. Option A is
  proposed.
- 7b: one rotation handle on the bounding box, or several? Corner handles could scale instead.
- Dragging an anchored point: today it slides only along its arm. He said circles can be dragged to where they
  are needed. Should a drag off the arm detach it and turn it into a free point (keeping number and layer)?
- Phase 8: dragging point 10 onto point 20 leaves two numbers at one place. Does a printed template need one
  number per hole (so a weld still has to merge numbers), or are two numbers at one spot acceptable? Revisit
  the scope of Phase 8 when it arrives. (decide when the phase arrives)

- Phase 8: weld rule (which layer moves, freezing, automatic or asked), weldable objects (line types first).
- Merge: always the top two layers; which number the merged layer keeps; frozen weld points hold it together.
- Phase 10: whether `visible` is saved; the Save As filesystem steps are in `node/createFigureService.mjs`
  (new category directory, help mirror, manifest) and need exclusive create, temp-then-rename manifest,
  empty-slug rejection and duplicate-name suffixes.
- Parametric objects have no draggable points yet; lobe numbering is the first idea.
