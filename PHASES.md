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
| 6b | Points mode: click-to-place discs (anchored or free) on the active layer, global `nextPoint`, Points Mode checkbox, final display in points mode, a "Hit radius" subcommand (default 5 px) for tuning. Model below | Done, merged |
| 6c | Layer colors: each layer has a color, shown on its number in the strip and changeable there; that layer's numbered points are drawn as circled numbers in the same color. Retire the old coded-number display (printCircNum and `drawState.ctr`), which only existed to name join points when numbers were coded by hand | Built on `claude/phase-6c`, awaiting his review (see "Phase 6c as built"). The old coded-number display is NOT retired: see the note there |
| 7 | Handle and drag: arrow-key nudging, 1 px, 10 px with Shift, of the object's own handles. (The "nudge a number label" part is dropped: discs have no visible numbers.) | Built on `claude/phase-7`, awaiting his review (see "Phase 7 as built") |
| 7b | Centroid and bounding box: every object has a visible centroid. Drag the centroid to move the object anywhere. Selecting a centroid shows a bounding box; grabbing the handle on the box rotates the object about the centroid | Built on `claude1` (no branch, Barry 2026-10-26), awaiting his review (see "Phase 7b as built") |
| 7c | Break apart an object into its pieces (own phase: it changes existing drawing code). A composite object, such as a polygon of stitched parabolas, is replaced by separate layers (Lines, Parabolas) that can be moved, welded and deleted on their own. Needs a `decompose()` on each object that supports it. Barry's route: redo the drawing commands so they can produce their objects as separate segments, and break apart uses that | Built on `claude/phase-7c`, awaiting his review (see "Phase 7c as built") |
| 8 | Welds (see "Phase 8 spec"). Order stays 7b, 7c, then 8 (Barry, 2026-10-26) | |
| 8b | Magic points: more candidate kinds (midpoints, tops of loops, cusps), needed as weld targets and for parametric objects | |
| 9 | Print aids: scale bar; minimum nail-spacing check (needs nail size and highlight-vs-list answers from Barry) | |
| 10 | Save and recovery (Save As, category and manifest creation, reload) | |
| 11 | Figure follow-ups  | |
| 12 | Thumbnails (the Insert list becomes icons with a larger preview on mouseover) | |
| 13 | Sweep tool | |
| 14 | Filesystem boundary refactor (C3) | |

Barry's "Deferred" and "Dropped" lists belong here too. Paste them in from his original list; they are not
reproduced above.

## Phase 6b as built

- Left column: Show All, a Points Mode checkbox, Insert Object (6c made Show All a checkbox). Points Mode shows only the layers' points (it
  sets `drawState.final` while the layers draw) and adds click handling from `figurePointer.js`.
- Only the active layer can be changed. A click (press and release without moving) on a disc of the active layer
  selects it (reach is the larger of the hit radius and the 9 px marker). A click within the hit radius of an
  infrastructure point of the active layer makes an anchored disc. A click anywhere else makes a free disc,
  which belongs to the active layer. Delete or Backspace, or "Delete selected point" in the caption menu,
  removes the selected disc. Numbers are never reused. Changing layer or mode clears the selection.
- Anchored discs are not dragged. The object's own handles (red dots) are live on the active layer in both
  modes through the existing interactor. A press that moves is a drag; a press that does not move is a click,
  so a disc can be placed on a handle (an end point). (6c lets free discs be dragged.)
- The selected disc has a thick red rim plus a second red ring just outside it.
- Anchored discs keep their exact fraction along the arm when the step count or the object changes, and ride
  along when a handle is dragged.
- Discs are drawn in both modes, at full strength on every layer, with their numbers inside for now (6c makes
  them unnumbered and colored). The Numbers button is gone.
- Caption menu "Hit radius (N px)..." sets `uiState.figures.hitRadius` (default 5; one value for now, not saved).
- Line and Parabola define `infrastructure()`; other registry objects have none yet, so on them only free points.
- Files: `figurePoints.js` (data, picking, drawing), `figurePointer.js` (mouse, keyboard).

## Phase 6c as built

- Each layer has `color` in its layer data (`figure.layers[i].color`), handed out in turn from `LAYER_COLORS` in
  `figureLayers.js`. The layer's number in the strip sits on a chip in that color. Right-click the chip to pick a
  color (a hidden native color input; Coloris was not used).
- Discs are filled with their layer's color and drawn without numbers. Numbers stay as hidden ids.
- Discs of layers other than the active one are drawn at 50% (`DISC_DIM_ALPHA` in `figurePoints.js`; layers
  themselves stay at 20%). A hidden layer's discs are hidden unless Show All.
- Points mode now follows the same visibility and dimming rules as lines mode. It only changes what a layer
  draws (just its points) and what a click does.
- Show All is a checkbox. In points mode the Line, Parabola and Insert Object tools are grayed and inactive.
  Layer buttons, the Show checkbox and the object controls stay active. "Delete selected point" is enabled only
  in points mode with a disc selected.
- A free disc can be dragged in points mode (press clear of the handles, move). An anchored disc cannot. A press
  on a handle still belongs to the interactor.
- Hit radius stays 5.
- Not done, on purpose: `printCircNum` and `drawState.ctr` are still in `draw/drawUtilities.js`. No registry
  object (nothing a Figure layer can be) calls them, so Figures never shows coded numbers. They are called by
  pattern and gallery scripts (`patterns/circles/armsInCircles.js`, `patterns/stuff/*`, `OverlappingStars.js`,
  `overlappingStars1.js` and others), so deleting them would break those. Retire them when those scripts are
  rewritten or dropped.

## 6b revisions requested by Barry (built; the wording below is his original request)

- Points mode becomes one checkbox. Remove the Numbers button; one command only.
- In points mode only the active layer can be changed: clicks pick candidates on the active layer only, a new
  free point belongs to the active layer, and points of other layers cannot be selected or dragged. Other layers
  stay as they are, dimmed.
- Entering points mode lets him click straight away to insert a disc (no second command).
- Showing every layer's points in points mode stays as built, for now. Barry is unsure it is a good idea.
- Numbers are no longer displayed (Barry does not expect to need them). They stay as hidden identity (global
  `nextPoint`, never reused) for welds and saving. The circles are drawn unnumbered, filled with the layer color
  (6c). The show/hide numbers control is dropped unless he asks for it again.
- LATEST (supersedes the drag items above): the only draggable points are the object's own handles, the ones
  that existed before Figures. Placed circles come along for the ride: an anchored circle follows its
  infrastructure line proportionally, and nothing drags a circle itself. Reason: any arbitrary draggable point
  would force every drawing routine to know how to respond, which is much more design work.
  Built: the object handles stay active in both modes on the active layer; circle dragging is removed; points
  mode only adds click-to-place and delete.
- Free discs drag (6c). Done in 7b: a free disc is stored in its layer's object space (`ox`, `oy`), so it
  travels with the layer.
- Welds are made only between points that have placed discs. An object's end point is not weldable until
  a circle has been placed on it. (Retracted: an earlier suggestion that handles are automatically weldable.)
- Numbers are ids. Existing code already resolves a point given as a number: `numbersToPoints` in
  `draw/drawUtilities.js` looks the number up as an index into `drawState.pts`. Figure point numbers should
  plug into the same kind of lookup when welds and saving arrive, so a point can be given as just a number.

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
   Also in this item (Barry, 2026-10-26):
   - A "Create bounding box" command: makes a template layer showing the bounding box of an object. Not the
     transient rotation box that 7b shows when a centroid is selected.
   - UI: a pulldown list to insert a template, on the caption-bar line next to the Line and Parabola buttons.
   - Merge is ELIMINATED (Barry, 2026-10-26): "I think there are other ways to do what I'm thinking."
   - Every template layer carries an X that dismisses it. Open: does dismiss hide or destroy? Recommended: hide
     (see the note below).
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
- Placed circles are not dragged. They ride along with the object (see the latest revision below). A circle can be deleted. Near points are not welded; only an explicit weld (Phase 8) makes
  two points one.
- A point's label can be nudged slightly without moving the point (offset stored with the point; Phase 7).
- A free point belongs to a layer: the topmost layer (`drawOrder[0]`) when it was clicked. It does not follow
  that layer, but it takes the layer's color (6c). Point circles may be filled with the layer color.
- Registry objects must say which of their lines are infrastructure. 6b covers Line and Parabola only.

## Vocabulary

- **Handle**: one of the object's own draggable red dots (`params.points`). The only draggable points.
- **Disc**: Barry's working name for the filled circle placed on a layer (formerly "drag circle"). Not draggable;
  it rides along with its object.
- **Numbered point**: the data record behind a disc; anchored or free (see the point model).
- **Infrastructure line**: a line that carries discs. Stitch lines do not.
- **Centroid**: the visible center of an object: the center of its bounding box (Phase 7b, built).

## Disc rules (Barry)

- A disc tied to a point on an infrastructure line stays at that point. It can be deleted, or it can move to
  follow changes in the line (staying proportional), e.g. a middle disc stays in the middle when the line gets
  longer or shorter.
- If the point a disc is anchored to disappears, the disc disappears too (Barry, 2026-10-26; Phase 8 acts on it).
- A free disc moves only when dragged (points mode, 6c). It can be deleted. Anchored discs are not dragged.
- Attachment between objects: both ends of the green parabola in his example follow the blue object when it is
  rotated or enlarged. Rules are needed for what happens when the blue object gets more or fewer sides or
  end points, so that an attached end still has a place to stay. Formalize before Phase 8.

## Open design questions


- 6c: answered. Discs have no numbers and the Numbers button is gone; the old coded numbers remain in the draw
  utilities for his pattern scripts (see Phase 6c as built).
- 7b mechanism (accepted: Option A, refined): no canvas operations (no ctx move or rotate). Each layer has a
  transform (move, rotate, later scale) held in `drawState` while that layer draws, and `drawLine` maps its two
  end points through it (and `displayPoint` for dots). Nearly all drawing already goes through `drawLine`. The
  exceptions are `draw/drawSpirals.js` (24 direct ctx calls), `draw/drawLinkedCircles.js` (4) and the circle and
  text helpers, which need small changes. One function maps object space to canvas space for everything else
  (infrastructure, drag circles, picking, welds), so no layer is special and different transforms can coexist.
  Welds compare points in canvas space.
- 8 / 7c: dragging a welded point. SUPERSEDED by "Phase 8 spec" (no leader and follower; the dragged end drives).
- 7b: how to rotate. Option A: every layer gets a transform (move, rotate, later scale) applied around its
  centroid when it draws, so all objects work without changes; the cost is that drag circles and infrastructure
  positions must be mapped through the same transform. Option B: rewrite each object's own params. Option A is
  proposed.
- 7b: one rotation handle on the bounding box, or several? ANSWERED in 7b: one, on a stem above the top edge.
  The corners are left free for scaling later.
- Dragging an anchored point: today it slides only along its arm. He said circles can be dragged to where they
  are needed. Should a drag off the arm detach it and turn it into a free point (keeping number and layer)?
- Phase 8: dragging point 10 onto point 20 leaves two numbers at one place. Does a printed template need one
  number per hole (so a weld still has to merge numbers), or are two numbers at one spot acceptable? Revisit
  the scope of Phase 8 when it arrives. (decide when the phase arrives)

- Phase 8: weld rule (which layer moves, freezing, automatic or asked), weldable objects (line types first).
- Merge: eliminated (Barry, 2026-10-26). Nothing to decide.
- Phase 10: whether `visible` is saved; the Save As filesystem steps are in `node/createFigureService.mjs`
  (new category directory, help mirror, manifest) and need exclusive create, temp-then-rename manifest,
  empty-slug rejection and duplicate-name suffixes.
- Parametric objects have no draggable points yet; lobe numbering is the first idea.

## Phase 8 spec (Barry's corrections, 2026-10-26; replaces the old leader and follower wording)

Decided:
- A weld joins discs on different layers. Discs are explicit only; nothing is added to the numbered array
  automatically. A weld is a group of two or more discs at one place (8 parabolas on one center is one group).
  Joining a group means welding to any member. Groups are stored in the figure data as lists of
  `{layer, n}` (layer number and disc number), so stacking order does not matter.
- A weld can be anywhere on an object. It is not a draggable point itself. If one of its discs is draggable
  (a disc on a handle, or a free disc), dragging it moves the weld, and the other members and their objects
  follow. If none is draggable, the weld moves along with the objects.
- Creating a weld does not move anything: the discs must already be coincident, or nearly so. Moving the second
  disc to the first at creation is rejected as wrong.
- Moving: a handle dragged or nudged on the active layer drives. The move spreads outward through the welds;
  each layer moves at most once per drag. Followers reshape (their other handles stay). Hooks into `moveHandle`.
- Moving a welded object as a whole (7b centroid drag) pulls its partners.
- A weld that cannot be satisfied (both ends already moved) is left alone and drawn in red.
- Ring rule: reject a weld that would tie two different places into one loop. Joining a group is always allowed.
  Every rejection must be reported to Barry in some visible way (not silent).
- Unweld: remove a disc from a group or dissolve the group. A group down to one disc dissolves.
- If a member disc disappears (a step change or trim removes it, or it is deleted), it leaves the weld.
- A weld group is one nail on the printed template (Phase 9 counts a group once). Merged numbers: one hole per group.
- A weld group has its own symbol, not the stacked disc colors. Barry's first idea is a plus sign. Proposed: a
  black plus on a white halo, so it reads over any layer color and doubles as the nail-center mark.
- A Parabola corner is two handles at one spot; welding a corner joins both arm ends to the group.
- Welds are saved with the figure (Phase 10).

Open:
- A driven weld end meeting a mid-arm disc (position derived from two handles): which handles move? Proposed:
  the arm that carries the disc translates by the same amount; the object's other handles stay. Handle discs move
  just that handle.
- How a weld is created. Proposed: select a disc in points mode and run a Weld command (caption menu); it joins
  the disc with every disc on other layers within the hit radius, so a hub is made in one step. If none is
  near, say so. Not a click on a disc of another layer (points mode edits the active layer only).
- Where rejections and notices appear. Proposed: a short message in the caption bar, plus a mark on the discs.
- DECIDED (Barry, 2026-10-26): if the point a disc is anchored to disappears, the disc disappears too. A disc and
  its point are two objects, and he calls this a debatable feature. Applies when Phase 8 (or a later delete)
  removes an arm or point. Today an anchored disc whose arm disappears still keeps its last position
  (`refreshPoints`); Phase 8 changes that to removing the disc.
- Order: 7b, then 7c, then 8, then 8b. 7c is no longer a prerequisite for welds.

## Phase 7 as built

- A press on a handle selects it (orange with an outer ring); a press anywhere else clears the selection. The arrow
  keys then move it 1 px, or 10 px with Shift, in lines mode and points mode, on the active layer. Ignored while
  the keyboard is in a slider, list or text box. The interactor is shared, so the Draw tab nudges handles too.
- Dragging and nudging both go through one function, `moveHandle` in `ui/interactor.js`. Phase 8's weld
  propagation hooks in there.
- Selecting a handle does not move it. In points mode, clicking a handle also places a disc on it.
- Fixes from the 6c review findings (below): a press on empty canvas is always a click where it went down, even
  if it slips; only a press on a handle must stay still to count as a click. Hiding the active layer makes the
  next visible layer down active (stacking untouched); a hidden active layer ignores clicks in points mode and
  shows a not-allowed cursor, and its handles are off. Objects without `params.points` (`parametrics`,
  `regularPursuit`) get a working click layer in points mode.
- Test helper note: hiding the active layer changes the Show checkbox to the next layer, so tests click it
  instead of using `setChecked`.

## Phase 7b as built

Built directly on `claude1` (Barry: Phase 7 was already merged, no new branch).

- Every layer has `layer.transform = { angle, tx, ty }` (identity at first). `draw/drawTransform.js` holds the
  math. The object keeps drawing in its own coordinates ("object space"); the transform turns those into canvas
  pixels. No ctx.translate or ctx.rotate anywhere.
- `drawLine` maps both ends through `drawState.transform` and notes them in `drawState.bounds`. Both are null
  except while a figure layer draws (`redrawFigure` sets and clears them), so the Draw tab and the patterns are
  unchanged. `drawCircle` and `drawLinkedCircles` map their centers; the radius is unchanged. `displayPoint` is
  NOT mapped (it receives points `drawLine` has already mapped).
- Handles are stored in object space and shown, hit and dragged in canvas space (`interactor.js`: `toCanvas`,
  `toObject`; an instance supplies `getTransform`). Arrow keys nudge in canvas directions.
- Infrastructure arms are mapped by `figurePoints.js` before a disc is found or placed. A free disc keeps
  object-space `ox`, `oy` and gets `x`, `y` recomputed on every redraw, so free and anchored discs both travel
  with the layer.
- Centroid (`ui/figures/figureCentroid.js`): the center of the bounds of everything the layer drew (object space),
  so it needs no per-object code. Drawn as a diamond on the "bbox" overlay for the active visible layer. Drag it to
  move the layer. Click it to select it (orange): a dashed bounding box (bounds + 6 px) and one round rotation
  handle on a stem above the top edge appear. Drag that handle to turn the layer about the centroid. With the
  centroid selected the arrow keys move the layer 1 px (10 with Shift). A press anywhere else on the canvas, a
  layer change, hiding the layer or switching mode deselects.
- Decisions I made (Barry to confirm or reverse):
  - One rotation handle, no corner handles yet (corners stay free for scale).
  - Centroid = center of the bounding box, not an average of points.
  - The centroid wins a press over a handle under it. A Line's midpoint handle is exactly under its centroid, so on
    a Line the midpoint handle is no longer reachable; dragging the centroid does the same visible thing but edits
    the transform instead of the object's numbers. The nudge test now uses the centroid for that case.
  - Lines mode only. In points mode the centroid is hidden and clicks go to discs, because a Line's midpoint is
    both its centroid and the natural place for a disc.
  - Only the active layer shows a centroid. Show All (preview) and final mode hide it.
  - No Shift-snap for rotation angles.
  - Moving a welded member is a Phase 8 matter (see Weld hubs).
- Not mapped: `draw/drawSpirals.js` (direct ctx dots, used by scripts only) and `draw/background.js`. Nothing in the
  registry reaches them; if a future registry object uses them it will not follow the transform.
- Tests: Part 7b in `tests/tabSwitch.mjs` (identity at first, bounds, move, rotate a quarter turn about the
  centroid, handle drag after rotation, free and anchored discs travel, points mode hides the centroid, deselect,
  every registry object produces bounds). Two older nudge checks changed because of the Line midpoint rule above.

## Phase 7c as built

Barry's route: the object already has all its points, so hand them to the Parabola and give each its own layer.

- Caption "v" menu, **Break apart**: enabled when the active layer is visible, its object has a `decompose()`, and
  the tab is in lines mode (like Insert). It replaces the object with its pieces.
- `decompose()` on a registry object returns `[{ key, params }]` (registry key and full params for that piece).
  Only `regularPolygon` has one so far: one Parabola per pair of neighboring sides. The points come from
  `regularPolygonParabolas(thing)` in `draw/drawRegular.js`, which uses the same nodes, lines and arms as
  `drawRegularPolygon`, minus the drawing. Shorten is built into the points and step count (the pieces start with
  Trim and Shorten at 0), so each Parabola draws exactly the stitches the polygon drew. Color and line width carry over.
- `breakApartLayer(tabId)` in `figureLayers.js`: each piece goes in through `insertLayer(tabId, key, { params,
  transform })`, on top of the stack, with a copy of the layer's transform, so a moved or rotated polygon breaks
  apart in place. The last piece becomes active.
- The original layer is hidden, not deleted (layer numbers are never reused; delete-layer is Phase 11). Its discs
  stay with it. Show it again from its number to get it back; Show All draws it too, on top of the pieces.
- Pieces start at the polygon's step count. A Parabola's Steps slider stops at 30 and a polygon's at 64, so a piece
  of a 64-step polygon draws 64 until the slider is touched.
- Test: the picture is compared pixel for pixel before and after (default polygon, and a shortened 7-node one),
  and again for a moved and turned layer. All identical.
- Not done: the other composite objects (inner star, inverse star, circular parabola, mystic rose and the rest).
  Each needs its own `decompose()` the same way; the Parabola ones are the same few lines.

## 6c review findings (Barry's testing, 2026-10-26; fixed in Phase 7)

- Points mode, first click did nothing for Barry and he could not reproduce it. Three causes found:
  1. A press that moves more than 4 canvas px (`CLICK_SLOP` in `figurePointer.js`) counts as a drag, and a drag
     on empty canvas does nothing, silently. A 6 px slip makes no disc; a 2 px slip does.
  2. With the active layer hidden, a click makes a disc on that hidden layer, and discs of hidden layers are not
     drawn, so it looks like nothing happened.
  3. Registry objects with no `params.points` (`parametrics`, `regularPursuit`): `armInteractor` hides the shared
     interaction layer and returns, so points mode gets no mouse at all on those layers.
- Hiding the active layer leaves it active (nothing changes `activeLayer`), and every other layer stays dimmed.
  Barry saw the layer underneath become active and undimmed; not reproduced. Proposed rule: hiding the active
  layer makes the next visible layer down (in `drawOrder`) active.

## Weld hubs (Barry, 2026-10-26: e.g. 8 parabolas welded to one center point)

- Model a weld as a group (one record listing every disc at that point), not as pairwise welds. Dragging any
  member's handle moves all members; each object moves once per drag.
- Revises the ring rule: joining a group is always consistent, since the points coincide. Reject only a weld that
  would tie two different places into one loop.
- A group is one nail on the printed template. Phase 9's nail-spacing check counts each group once. This also
  answers the Phase 8 question about merged numbers (one hole per group).
- Display: the stacked discs show only the top layer's color; a group probably wants its own marker.
- A Parabola corner is two handles at one spot (end of arm 1, start of arm 2). Welding a corner means both arm
  ends get a disc and join the group.
- 7b: moving a hub member by its centroid pulls the partners (Barry, in the Phase 8 spec above). Phase 7b leaves
  welds alone because welds do not exist yet; Phase 8 hooks into the centroid move (`setTransform` in
  `ui/figures/figureCentroid.js`) the way it hooks into `moveHandle`.

## Dismissing a template (X on a template layer): open

- Recommended: the X hides the layer (`visible = false`). Layer numbers never change and layers are never deleted
  yet, so a destroy would need delete-layer rules first (numbers never reused, discs on the layer, welds to it).
  A template is already left out of Show All and the final drawing, so a hidden one costs nothing and can be
  shown again from its number in the strip. Delete-layer belongs with Phase 11 follow-ups.
- Open: inserting the same template again while a hidden copy exists: show the hidden one or add a new layer.
  Other inserts add a new layer offset 20 px.

