"""docs/build/makePhasesPdf.py

Builds docs/Remaining-Phases.pdf: every phase still to do, from the rest of
Phase 8 onward, with what each one will actually do. The authority is
PHASES.md; this is a longer description of the same list.

    python3 docs/build/makePhasesPdf.py

Not part of the app. Needs pypdf (Python) and Playwright (Node); see
pdfdoc.py.
"""

import html
import os
import subprocess
from datetime import date

from pdfdoc import build_pdf, page_shell

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "docs", "Remaining-Phases.pdf")

EXTRA_CSS = """
.facts { display: grid; grid-template-columns: 9em 1fr; gap: 2pt 10pt; font-size: 9.5pt;
         margin: 4pt 0 10pt; padding: 6pt 9pt; background: #f4f6f9; border-left: 3px solid #9aa6b8; }
.facts b { font-family: Inter, sans-serif; font-weight: 600; color: #5b6170; }
.q { background: #eef5f9; border-left: 3px solid #6aa3c8; padding: 6pt 9pt; margin: 6pt 0 10pt; }
.q ol, .q ul { margin-bottom: 0; }
"""


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True).stdout.strip()


def facts(**kw):
    rows = "".join(f"<b>{html.escape(k.replace('_', ' '))}</b><span>{v}</span>" for k, v in kw.items())
    return f"<div class='facts'>{rows}</div>"


# Each section: (anchor, contents label, short description for the TOC, body html)
SECTIONS = []


def section(anchor, title, desc, body):
    SECTIONS.append((anchor, title, desc, body))


# ---------------------------------------------------------------------------
section("intro", "How to read this", "", """
<p>This covers every phase still to do, starting with the rest of Phase 8. The list and its order are yours
(<code>PHASES.md</code>); this document only says, for each phase, what would actually be built, which files
it touches, what it depends on, how it would be tested, and what has to be decided before it starts.</p>
<p>Two kinds of text are mixed here and kept apart on purpose:</p>
<ul>
<li><strong>Recorded.</strong> What you decided or said, as it stands in <code>PHASES.md</code> and the planning
  notes.</li>
<li><strong>Proposed.</strong> My plan for how to do it. Marked "Proposed" where it matters. Nothing proposed
  here is decided.</li>
</ul>
<p>Each phase opens with a grey box: its status, what it needs first, its rough size (small: a day's session;
medium: two or three; large: more, or several passes), and the files it is expected to touch.</p>
<p>The working rules are unchanged: one phase at a time, each on its own branch, design discussion before
building, tests (<code>npm run test:tabs</code>) extended every phase, and a stop for your review and "go"
after each.</p>
<p><strong>One gap in the record.</strong> <code>PHASES.md</code> says your "Deferred" and "Dropped" lists
belong in it but were never pasted in. I could not find them anywhere I can see. Phase 13 (the sweep tool) has
no description anywhere either; see that section.</p>
""")

section("order", "The list at a glance", "", """
<table>
<tr><th style="width:11%">Phase</th><th>What</th><th style="width:22%">Status</th></tr>
<tr><td>8, next pass</td><td>A handle dropped on another handle welds; the weld + made visible; the centroid
  ignores the right button</td><td>Specified; six questions open</td></tr>
<tr><td>8b</td><td>Magic points: midpoints, tops of loops, cusps (and perhaps crossings) as places a disc can
  go</td><td>Not started; needs design</td></tr>
<tr><td>9</td><td>Print aids: scale bar, minimum nail-spacing check, printing at size</td><td>Not started;
  needs your answers</td></tr>
<tr><td>10</td><td>Save and reopen a figure (Save As, category, manifest); undo proposed alongside</td><td>Not
  started; part of the Node side exists</td></tr>
<tr><td>11</td><td>Figure follow-ups: delete a layer, the grayed menu items, more Break apart, the curved
  objects</td><td>A collection; you choose what goes in</td></tr>
<tr><td>12</td><td>Thumbnails in the Insert list, larger preview on hover</td><td>Not started</td></tr>
<tr><td>13</td><td>Sweep tool</td><td>No description on record</td></tr>
<tr><td>14</td><td>Filesystem boundary refactor (C3)</td><td>Not started</td></tr>
<tr><td>15</td><td>Investigate redoing the older tabs on the <code>figuresCommands.js</code> pattern</td><td>New
  today; investigate first</td></tr>
<tr><td>End list</td><td>Nine end-of-work items, ending with the HTML help pages</td><td>Not started</td></tr>
</table>
<p><strong>Dependencies worth knowing.</strong> Phase 9 is easier after 10 (you print a saved figure, not a
scratch one). Undo shares its hardest piece with 10. Phase 14 would change how 10 talks to Node, so 10 should
be written against a small, clean call (one <code>saveFigure</code>), which 14 later absorbs. Phase 15 and
end-list items 4 and 6 overlap (all three are about tidying the older tabs) and could be done together.</p>
""")

# ---------------------------------------------------------------------------
section("p8next", "Phase 8, next pass: drop a handle on a handle to weld",
        "the rest of Phase 8", facts(
            Status="Specified in <code>PHASES.md</code>; six questions open for you",
            Needs_first="Your answers to the questions below",
            Size="Small to medium",
            Files="<code>ui/interactor.js</code> (a hook on release), <code>ui/figures/figureWelds.js</code>, "
                  "<code>figureLayers.js</code> (wiring), <code>figureCentroid.js</code> (one line), "
                  "<code>tests/tabSwitch.mjs</code>") + """
<h2>Why</h2>
<p>The second weld bug came from the rule that a disc goes on the <em>active</em> layer only. With the Line
active, a click at the Parabola's end made a free disc on the Line, and the weld that followed tied the Line to
itself. You had to remember which layer was active, in points mode, before a right-click. Dropping a handle on
a handle removes all of that: you are already holding the thing you want to join.</p>

<h2>What will be built</h2>
<ol>
<li><strong>A release hook in the interactor.</strong> <code>interactor.js</code> already has
  <code>beforeMove</code> and <code>afterMove</code>. It gets one more optional setting,
  <code>onRelease(index)</code>, called when the mouse comes up after a real drag (not a click, not an arrow
  key). The Draw tab passes nothing, so nothing changes there.</li>
<li><strong>Finding the target.</strong> On release, Figures looks for a handle of any <em>visible</em> layer
  (the active one included, for a corner) whose canvas position is within the grab range of the dropped
  handle. Every layer's handles are mapped through its own transform first, the same way
  <code>figurePoints.js</code> maps arms, so a moved or turned layer works.</li>
<li><strong>Snapping.</strong> A weld needs its members to coincide exactly, so the dropped handle is moved the
  last few pixels onto the target, through <code>moveHandle</code>, so any welds the dropped handle already
  has follow. Only the handle being dragged moves; the target never does.</li>
<li><strong>Making the weld.</strong> If either handle has no disc, one is placed (an anchored disc at the
  arm end: the same record a points-mode click makes). Then the two discs are joined by the same code the
  right-click uses (<code>toggleWeldAt</code>'s join half, pulled out into its own function so both callers
  share it). If one of them is already in a group, the other joins that group; if both are in different
  groups, the groups merge.</li>
<li><strong>Telling you.</strong> The same caption-bar message as now ("Welded"), and the weld + appears.</li>
<li><strong>The weld + made visible.</strong> Today the + is drawn on the main canvas and the handle's red dot
  is drawn over it on the interaction layer, so all you see is a white ring. Proposed: draw the + on the
  interaction layer, after the handles, slightly larger than a handle (arms of 7 px). That also makes it the
  thing your eye lands on.</li>
<li><strong>The centroid's button check.</strong> <code>figureCentroid.js</code>'s mousedown gets the same
  one-line <code>if (e.button !== 0) return;</code> the interactor got, so a right-press on the diamond no longer
  starts a move.</li>
</ol>

<div class="q"><strong>Questions for you (from <code>PHASES.md</code>, with what I propose):</strong>
<ol>
<li><strong>When.</strong> On release only, so passing over a handle on the way somewhere does not weld it.
  (Proposed: yes.)</li>
<li><strong>How close.</strong> Within the 10 px grab range, then snap. (Proposed: yes.)</li>
<li><strong>Discs.</strong> Placed automatically on both handles and left visible like any other disc.
  (Proposed: yes.)</li>
<li><strong>Which handles.</strong> Arm ends only. A Line's midpoint handle slides the whole line and is not a
  place a disc can go; a Parabola's midpoint handle sometimes is. (Proposed: arm ends only.)</li>
<li><strong>Same object.</strong> Dropping a Parabola's one corner handle on its other corner ties the corner,
  exactly as a right-click does now. (Proposed: yes.)</li>
<li><strong>Undoing.</strong> Right-click on the weld still removes it. A drop that welds by accident has no
  other undo until the undo work (see Phase 10). Acceptable for now?</li>
</ol>
One more I'd add: <strong>should it work in points mode too?</strong> Handles are off in points mode today, so
proposed: lines mode only, which is where you drag handles anyway.</div>

<h2>Testing</h2>
<ul>
<li>Two Lines: drag one end onto the other's end; a weld exists, both have discs, the ends coincide exactly.</li>
<li>Drag across a handle without releasing on it: no weld.</li>
<li>Release 15 px away: no weld, nothing moves.</li>
<li>Parabola corner to itself: one group with both corner handles.</li>
<li>Drop onto a handle already in a group: one group, three members.</li>
<li>A moved and turned layer: the target is found where it is drawn.</li>
<li>Draw tab: dragging still works and nothing welds.</li>
<li>The + is visible: a pixel check at the weld that sees black, not only white.</li>
<li>Right-press on the diamond: the layer's transform is unchanged.</li>
</ul>
""")

section("p8b", "Phase 8b: magic points", "more places a disc can go", facts(
    Status="Not started; needs design with you",
    Needs_first="Phase 8 settled",
    Size="Medium to large, depending on how many kinds",
    Files="<code>ui/figures/figurePoints.js</code> (candidates), the registry objects that gain points, "
          "possibly <code>draw/drawParametrics.js</code>") + """
<h2>What it is</h2>
<p>Today a disc can only go on an <em>infrastructure point</em>: a step along an arm that the object reports
through <code>infrastructure()</code>. Plenty of the places you would want to put a nail, or weld two objects,
are not steps: the middle of a Parabola's curve, the top of a loop in a cycloid, the cusp of a parametric
curve. "Magic points" are those extra places, offered as candidates the same way arm steps are now.</p>

<h2>What will be built (proposed)</h2>
<ol>
<li><strong>A second list beside the arms.</strong> <code>infrastructure()</code> may return, besides
  <code>arms</code>, a list of named <code>points</code>: <code>{ name, x, y }</code> in object space, recomputed
  each time like everything else. A disc on one is stored as <code>{ kind: "magic", layer, name }</code>, so it
  follows the object the way an anchored disc does: by asking the object again, not by remembering a
  position.</li>
<li><strong>The picker considers both.</strong> <code>findCandidate()</code> looks at arm steps and magic
  points together, nearest wins. Nothing else about clicking changes.</li>
<li><strong>Welds work unchanged</strong> for discs on magic points, except for how a follower moves: a magic
  point is not a handle, so a weld driven onto one translates the whole layer (rule 3 of the weld propagation),
  the same as a node of a Regular Polygon today.</li>
<li><strong>Kinds, one at a time.</strong> Proposed first: midpoints of arms (cheap, all straight objects),
  then the Parabola's vertex (the point of the envelope nearest the corner). Tops of loops and cusps belong to
  the parametric and cycloid objects and need their own math; each is its own small step.</li>
</ol>

<h2>Related, and a decision for you</h2>
<p><strong>Crossings.</strong> Your stated goal is to print points <em>including intersections</em>. The planning
notes call these "first-class intersections" (items I2, I3). They are the same mechanism, one level harder:
the place depends on two lines, possibly from two layers. <code>draw/drawParametrics.js</code> already has a
segment-crossing test, used when thinning curves; the crossings it finds are thrown away. Proposed: decide in
8b whether crossings are in scope, and if so do crossings within one layer first.</p>
<p><strong>Parametrics have no handles and no node array yet</strong> (noted since 6c). Magic points are the
first route by which a parametric object gets anything to click on.</p>

<div class="q"><strong>Questions for you:</strong>
<ol>
<li>Which kinds matter first for the figures you want to make?</li>
<li>Are crossings in 8b, later, or never?</li>
<li>Should magic points show as faint marks in points mode, so you know they are there, or only when the cursor
  is near?</li>
</ol></div>

<h2>Testing</h2>
<p>For each kind: its computed position against hand-worked numbers for a default object; a real click lands a
disc there; the disc follows when the object is reshaped, moved and turned; a weld to it moves the partner.</p>
""")

section("p9", "Phase 9: print aids", "scale bar, nail spacing, printing at size", facts(
    Status="Not started; needs your answers on nail size and how warnings show",
    Needs_first="Best after Phase 10 (print a saved figure)",
    Size="Medium",
    Files="new <code>ui/figures/figurePrint.js</code>; <code>draw/drawUtilities.js</code> (final mode); "
          "<code>figuresCommands.js</code> (menu items)") + """
<h2>What it is for</h2>
<p>The end goal is a template you lay on wood and pound nails through. Final mode already draws only the
points. What is missing is everything that makes the paper usable: knowing it is the right size, knowing no two
nails are too close to hammer, and getting a large figure onto letter-size sheets.</p>

<h2>What will be built</h2>
<ol>
<li><strong>A scale.</strong> The figure is in canvas pixels; paper is in inches or millimetres. A figure gets
  one number, <em>pixels per inch</em> (proposed name <code>figure.scale</code>), set from a dialog: "this
  figure should be N inches wide", or "this distance is N mm". It is saved with the figure (Phase 10). Nothing
  in the drawing changes; only printing uses it.</li>
<li><strong>A scale bar.</strong> In final mode, a bar of known length (1 inch or 2 cm, with tick marks) is
  drawn in a corner, so after printing you can lay a ruler on it and see whether the printer scaled the page.
  This is the single most useful check, because browsers and printers love to "fit to page".</li>
<li><strong>Minimum nail-spacing check.</strong> Every printed point is collected (discs and, in final mode,
  stitch endpoints; a weld group counts once, since it is one nail). Any two closer than the minimum spacing
  are flagged. The minimum comes from the nail: head diameter plus room for the hammer, a setting you give.</li>
<li><strong>Printing at size.</strong> You said you print just the points, at size, usually in quarters, and
  join the sheets. Proposed: a "Print at size" command that renders the points at the figure's scale onto as
  many letter pages as needed, each with a small overlap, crop marks, and a page label ("2 of 4, top
  right"), as a PDF you open and print at 100%. This replaces the Snagit step rather than adding to it.</li>
</ol>

<div class="q"><strong>Questions for you (recorded as open):</strong>
<ol>
<li><strong>Nail size.</strong> What nails, and what minimum spacing feels right? (A default you can change.)</li>
<li><strong>Highlight or list.</strong> Should crowded pairs be circled in red on the canvas, listed by
  number, or both?</li>
<li>Do you want the tiled PDF, or keep printing from Snagit and just get the scale bar?</li>
<li>Should points print as dots, crosshairs (easier to centre a nail on), or small circles?</li>
</ol></div>

<h2>Testing</h2>
<p>Two discs placed a known distance apart at a known scale are flagged or not as expected; a weld group counts
once; the scale bar's length in the PDF, measured in PDF units, equals one inch; a figure twice a page wide
produces the right number of tiles with the overlap.</p>
""")

section("p10", "Phase 10: save and reopen a figure", "Save As, category, manifest, reload; undo", facts(
    Status="Not started. A Node handler from the old wizard exists and would be reshaped",
    Needs_first="Nothing. Undo (below) is proposed alongside",
    Size="Large (the biggest remaining phase)",
    Files="<code>node/createFigureService.mjs</code>, <code>node/sketchpadService.mjs</code>, "
          "<code>ui/nodeLayer.js</code>, <code>ui/figures/figureLayers.js</code>, <code>figuresNav.js</code>, "
          "<code>figuresCommands.js</code>, <code>figuresDisplay.js</code>, new <code>figureUndo.js</code>") + """
<h2>What it is</h2>
<p>Today a figure lives only in memory. Refresh the browser and it is gone. Phase 10 makes a figure a file: you
name it, put it in a category, and it appears in the Figures tab's category list, where clicking it opens it
again exactly as it was.</p>

<h2>What is saved</h2>
<p>The figure is already plain data, kept that way on purpose for this phase:
<code>{ name, category, nextPoint, points, layers, drawOrder, activeLayer, welds }</code>, where each layer
holds its registry id, its parameters, color, visibility and transform. That object, written as JSON, is the
file. No code is generated (the old wizard generated a JS file; that idea is dropped, since data is easier to
edit and never goes stale).</p>

<h2>What will be built</h2>
<ol>
<li><strong>Save As</strong> in the caption menu: a small dialog asking for the name and a category (existing
  from a list, or new). The subtab is renamed from "Untitled N" to the name.</li>
<li><strong>Save</strong> for a figure that already has a file: writes it again, no dialog.</li>
<li><strong>The Node side.</strong> One request, <code>saveFigure</code>, with the figure as its payload. The
  handler, reshaped from <code>createFigureService.mjs</code>:
  <ul>
  <li>makes the category folder if it is new, and its help mirror and manifest;</li>
  <li>writes the figure to a temporary file and renames it into place, so a crash never leaves half a file;</li>
  <li>adds or updates the manifest entry (manifest written the same temp-then-rename way);</li>
  <li>refuses an empty or unusable name, and adds a number to a duplicate name (as you specified for the
    wizard: "if the name exists, a number is attached").</li>
  </ul></li>
<li><strong>Reopen.</strong> Clicking a saved figure in the category list loads the JSON and rebuilds it. The
  rebuild is the real work: each layer needs its live drawing object (an instance) made again from its id and
  parameters, with the callbacks the interactor and welds need. <code>insertLayer()</code> already does this
  for one new layer, mixed with "add a layer". Proposed: pull out <code>makeInstance()</code> and a
  <code>rebuildInstances()</code> that reopen (and undo) call.</li>
<li><strong>Notes and Show Script for a figure.</strong> A figure gets a <code>notes</code> text field (the
  "figure notes field" planned since the triage), shown by Notes; Show Script shows the JSON.</li>
</ol>

<h2>Undo, proposed alongside</h2>
<p>Your idea: snapshots of part of <code>uiState</code>. The figure is one plain object, so before each action
a copy goes on a stack (<code>structuredClone</code>); undo puts the copy back and calls the same
<code>rebuildInstances()</code> that reopening uses. That shared rebuild is why I propose building them
together. The full proposal, with when snapshots are taken and four questions, is the page <em>Undo in Figures:
a Proposal</em> in the Help Overview PDF.</p>

<div class="q"><strong>Questions for you (recorded as open, plus mine):</strong>
<ol>
<li>Is a layer's <code>visible</code> saved, or does a reopened figure show every layer?</li>
<li>Can a figure be saved into a category that also holds Draw objects of the same name? (The wizard spec said
  yes, with no relationship between the two.)</li>
<li>Undo with Phase 10, or on its own sooner?</li>
<li>Does closing an unsaved figure ask first?</li>
</ol></div>

<h2>Testing</h2>
<p>Save, reload the page, reopen: the figure is identical, compared pixel for pixel and field by field,
including welds and transforms, and a weld still moves its partner after reopening. A duplicate name gets a
number. A new category appears in the list. The test cleans up the files it writes (the existing tests already
restore manifests with <code>git checkout</code>).</p>
""")

section("p11", "Phase 11: figure follow-ups", "a collection; you choose what goes in", facts(
    Status="A placeholder in <code>PHASES.md</code>. Below is everything the notes push here",
    Needs_first="Phase 10 for some items (Copy, Archive need files)",
    Size="Each item small to medium; do them as separate passes",
    Files="mostly <code>ui/figures/</code>; registry objects for Break apart and arcs") + """
<p>Nothing in the record says what "follow-ups" means as a whole. These are the items that earlier phases
explicitly pushed to "Phase 11" or "later". Proposed: you pick which ones belong and their order.</p>

<h2>1. Delete a layer</h2>
<p>Layers are never deleted today; Break apart hides the original. A delete needs rules first: layer numbers
are never reused; its discs go with it; any weld that loses a member drops it (and dissolves at one member, as
now). Proposed: Delete Layer in the caption menu, with no confirmation if undo exists, a confirmation if not.
This is also what the template X would call, if you decide it destroys rather than hides.</p>

<h2>2. The grayed menu items</h2>
<p>Show Script, Copy, Archive and Reset are in the caption menu, grayed, so the menu has its final shape.
After Phase 10 they can work: <strong>Copy</strong> opens a duplicate as a new subtab; <strong>Archive</strong>
moves the file to the category's archive the way the other tabs do; <strong>Reset</strong> is undecided (back
to empty, or back to the last save?).</p>

<h2>3. Break apart for more objects</h2>
<p>Only Regular Polygon has <code>decompose()</code>. Inverse Star, Inner Star, Mystic Rose and the others would
each get one the same way: their parabolas or lines handed over as separate Parabola or Line layers, checked
pixel for pixel against the original as 7c was.</p>

<h2>4. The curved objects</h2>
<p>Circular Parabola and its Multi version still have no <code>infrastructure()</code>, because their outer arm
is a curve. Your StringThing-era <code>arcPoints(a, b, r_frac, n)</code> suggests a new <strong>Arc</strong>
object: two draggable ends and one curvature control, like a Parabola arm but curved. That gives discs and welds
something to sit on. It only matches a circular perimeter, not an ellipse.</p>

<h2>5. Smaller open items from earlier phases</h2>
<ul>
<li>Dragging an anchored disc off its arm: should it become a free disc? (Open since 6b.)</li>
<li>Scale in the layer transform, using the bounding-box corners left free in 7b.</li>
<li>Welded objects with different step counts (raised in the triage).</li>
<li>Boxes and Pursuit, skipped in 7d as temporary.</li>
</ul>
""")

section("p12", "Phase 12: thumbnails in the Insert list", "icons, larger preview on hover", facts(
    Status="Not started",
    Needs_first="Nothing",
    Size="Small to medium",
    Files="<code>ui/figures/figuresNav.js</code> (Insert list), a thumbnail folder, possibly the Node service") + """
<h2>What it is</h2>
<p>The Insert Object list is a column of names. With a dozen-plus registry objects, a name is a poor reminder of
what you get. Each entry becomes a small picture of the object, and resting the mouse on it shows a larger
one.</p>

<h2>What will be built (proposed)</h2>
<ol>
<li><strong>Making the pictures.</strong> Each registry object is drawn at its default settings onto an
  off-screen canvas and saved as a small PNG. The Patterns tab already does this for patterns
  (<code>writePatternThumbnail</code>, <code>missingImages.js</code>), so the same Node request is reused, not a
  new one.</li>
<li><strong>When.</strong> A "Make thumbnails" command, plus making any that are missing when the list is
  built. Pictures are files, so the list stays fast.</li>
<li><strong>The list.</strong> A grid of icons with the name underneath; on hover, a larger picture in a
  floating panel. Clicking inserts, as now.</li>
</ol>
<div class="q"><strong>For you:</strong> make pictures live each time (no files, always current, slightly slower),
or files (fast, need remaking when an object's defaults change)? Proposed: files.</div>
""")

section("p13", "Phase 13: sweep tool", "no description on record", facts(
    Status="Listed in your numbered list with no description",
    Needs_first="A description from you",
    Size="Unknown") + """
<p>I found no description of the sweep tool in <code>PHASES.md</code>, the planning notes, or the conversations I
can search. Rather than invent one, here are the two readings that fit what you have said before. Tell me which
(or neither).</p>
<h2>Reading A: sweep a parameter (my guess)</h2>
<p>In September you described exploring a design by cycling between variants and <em>sweeping</em> one
parameter, animated, to find "how much is too much", then combining. That is Sketchpad's second purpose
exactly. A sweep tool would pick one slider of the active layer, a start, an end and a speed, and animate the
object through that range, with a button to stop and keep the frame you like. It works on Draw objects as well
as figure layers, since it only moves a slider.</p>
<h2>Reading B: sweep to select</h2>
<p>Drag a rectangle over the canvas to select every disc or handle inside it, then move, delete or weld them
together. Useful once figures have many discs.</p>
""")

section("p14", "Phase 14: filesystem boundary refactor (C3)", "one place where the app talks to files", facts(
    Status="Not started",
    Needs_first="Best after Phase 10, so it absorbs the new save call",
    Size="Medium",
    Files="<code>ui/fileLayer.js</code>, <code>ui/nodeLayer.js</code>, <code>ui/manifest.js</code>, the tabs that "
          "build paths, <code>node/sketchpadService.mjs</code>") + """
<h2>What it is</h2>
<p>Item C3 in the triage, from an eight-step plan in your old notes. Today the browser reads files through
<code>fileLayer.js</code> and writes through the Node service, and you held that line deliberately (the strict
submenu structure exists to centralize Node access). You named two exceptions: the help system and the manifest
subsystem. Path building is half-moved: <code>fileLayer.path</code> exists, but the tabs still build script and
help paths inline.</p>

<h2>What will be done</h2>
<ol>
<li><strong>Map every place</strong> the app reaches a file or Node: reads, writes, manifests, help, thumbnails,
  saves. A table, delivered first, for you to read.</li>
<li><strong>One boundary.</strong> The app calls named operations (<code>loadManifest</code>,
  <code>saveFigure</code>, <code>writeThumbnail</code>, <code>listCategory</code>) and never builds a path or a
  request shape itself.</li>
<li><strong>Behavior unchanged.</strong> This is a refactor, not a redesign: same files, same formats, same
  screens.</li>
<li><strong>Tests at the boundary:</strong> a missing file, a duplicate name, a broken manifest, a failed write,
  a relative path refused.</li>
<li><strong>Clear out the dead code</strong> found while documenting: the fileLayer normalizers, the unreachable
  <code>drawRegistry</code> branch in <code>manifest.js</code>.</li>
</ol>
""")

section("p15", "Phase 15: older tabs on the figuresCommands pattern", "new today: investigate first", facts(
    Status="Added 27 October 2026 at your request",
    Needs_first="Nothing; best near the end, with end-list items 4 and 6",
    Size="Investigation small; any rebuild medium, one tab at a time",
    Files="<code>ui/figures/figuresCommands.js</code> as the model; each tab's commands and caption files") + """
<h2>What you asked</h2>
<p>You read <code>figuresCommands.js</code> and found it cleaner than the other tabs' equivalents. The phase is to
investigate redoing the existing tabs using it as the pattern. As you said, nothing has been looked at yet.</p>

<h2>What will be done</h2>
<ol>
<li><strong>Say what the pattern is.</strong> Write down what makes <code>figuresCommands.js</code> read cleanly
  (its header states what it owns and what it does not; one function builds the caption menu as a list; menu
  items are enabled or grayed by plain conditions), so the comparison is against something specific, not a
  feeling.</li>
<li><strong>Compare each tab</strong> (Home, Draw, Patterns, Gallery, Utilities) against it: where its command
  and caption code lives, how its menu is built, how much each would change.</li>
<li><strong>Report</strong> with a recommendation per tab: redo, partly redo, or leave alone. Some of the older
  code may be different for a reason the pattern does not cover.</li>
<li><strong>Rebuild only what you choose</strong>, one tab per branch, with the tab tests run each time and
  behavior unchanged.</li>
</ol>
<p>This overlaps with end-list items 4 (simplify tab activation) and 6 (one save and restore shape), which tidy the
same files. Proposed: do the three together.</p>
""")

section("endlist", "The end-of-work list", "nine items, help pages last", """
<p>From <code>PHASES.md</code>, in your order. These are smaller and mostly independent.</p>
<ol>
<li><strong>Check Coloris</strong>, the downloaded colour picker: version, that it loads, that it works without
  the dev server.</li>
<li><strong>Update <code>validateDrawRegistry</code></strong> once the JSON shape is stable, and add the rule
  that registry draw code draws only through <code>drawLine</code>.</li>
<li><strong>Cycloid radius control</strong> does not change the drawn size. Likely cause: <code>update()</code>
  does not set what <code>createNodes()</code> reads. A candidate fix exists on an old branch; it must be tested
  through the real slider.</li>
<li><strong>Simplify tab activation:</strong> Home starts with <code>saved</code> empty like the others, so the
  special START case in <code>setUI.js</code> goes; remove dead blocks. Its own small branch, since a mistake
  breaks the first screen.</li>
<li><strong>Utilities shows its last result again</strong> when you come back to the tab.</li>
<li><strong>One restore shape for all tabs:</strong> no tab's <code>save()</code> is ever called today; delete the
  dead save and restore code and document the one convention that is really used.</li>
<li><strong>Figure templates:</strong> ready-made guide shapes (rectangle, circle) as template layers, left out of
  Show All and the print; a temporary ruler between any two places; a "Create bounding box" template; a
  pulldown on the caption bar to insert one; an X to dismiss (hide, proposed). Design with you first.</li>
<li><strong>A Utilities command for the global hit radius</strong>, optional; dropped if unused.</li>
<li><strong>HTML help pages</strong>, always last. Ask which pages first. (Much of this was done today in the
  Help Overview update; the remaining question is which further pages you want.)</li>
</ol>
""")


def main():
    entries = [("group", "Contents")]
    heading = {}
    for a, t, d, _ in SECTIONS:
        entries.append(("row", a, t, d))
        heading[a] = t

    def make_html(toc):
        today = date.today().strftime("%d %B %Y").lstrip("0")
        commit = git("rev-parse", "--short", "HEAD")
        branch = git("rev-parse", "--abbrev-ref", "HEAD")
        parts = [
            "<div class='cover'><div class='kicker'>Sketchpad</div>"
            "<h1>The Remaining Phases</h1>"
            "<div class='sub'>From the rest of Phase 8 to the end of the list: what each phase will do</div>"
            f"<div class='meta'>Built {today} from {html.escape(branch)} at {html.escape(commit)}.<br>"
            "The authority is <code>PHASES.md</code>.</div></div>",
            f"<div class='section' id='contents'><h1>Contents</h1>{toc}</div>",
        ]
        for a, t, _, body in SECTIONS:
            parts.append(f"<div class='section' id='{a}'><h1>{html.escape(t)}</h1>"
                         f"<p class='back'><a href='#contents'>&larr; Contents</a></p>{body}</div>")
        return page_shell("Sketchpad: The Remaining Phases", "".join(parts), EXTRA_CSS)

    pages = build_pdf(make_html, entries, heading, OUT, "Sketchpad · Remaining Phases")
    print("wrote", OUT, len(pages), "sections")


if __name__ == "__main__":
    main()
