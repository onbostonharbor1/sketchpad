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
| 7 | Handle and drag: arrow-key nudging, 1 px, 10 px with Shift, of the object's own handles; nudge a circle's number label (placed circles are not themselves dragged, see revision below) | |
| 7b | Centroid and bounding box: every object has a visible centroid. Drag the centroid to move the object anywhere. Selecting a centroid shows a bounding box; grabbing handles on the box rotates the object about the centroid. Open: one handle or several on the box | |
| 7c | Break apart an object into its pieces (own phase: it changes existing drawing code). A composite object, such as a polygon of stitched parabolas, is replaced by separate layers (Lines, Parabolas) that can be moved, welded and deleted on their own. Needs a `decompose()` on each object that supports it | Added; placed before welds because weld-drag on composite objects depends on it |
| 8 | Welds | |
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
- Free discs drag (6c). Plan: after 7b, store a free disc as an offset from its layer's centroid so it also
  travels with the object.
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
- **Centroid**: the visible center of an object (Phase 7b).

## Disc rules (Barry)

- A disc tied to a point on an infrastructure line stays at that point. It can be deleted, or it can move to
  follow changes in the line (staying proportional), e.g. a middle disc stays in the middle when the line gets
  longer or shorter.
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
- 8 / 7c: dragging a welded point. Proposed rule: a weld has one leader (the object that was there first) and one
  follower. Only the leader's circle drags, and the follower's end moves with it; the follower's other points keep
  their place. The follower's circle at the weld is locked. To change that, use Unweld, or Break apart (7c). A
  rigid composite leader (a pentagon) cannot deform at one vertex, so it must be broken apart first. Unwelded
  objects never move each other.
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

## Weld behavior: open questions (to discuss before Phase 8)

- Settled direction: discs are explicit only (nothing is added to the numbered array automatically). A move
  flows one way, leader to follower; a follower never moves its leader. A weld is a pair of discs on different
  layers, referenced by layer number and disc number, so stacking order and "adjacent layers" do not matter.
- Open: chains (A leads B leads C): does C follow A?
- Open: moving a follower as a whole (7b centroid drag): block, break the weld, or move the rest while the
  welded handle stays?
- Open: the leader's disc disappears (fewer steps or sides) or is deleted: what happens to the weld?
- Open: cycles and a follower with two leaders: proposed rule is reject both.
- Decided in 6c: discs of non-active layers are drawn at 50%, so weld candidates stay visible but quiet.
