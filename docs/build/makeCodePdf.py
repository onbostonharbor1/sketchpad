"""docs/build/makeCodePdf.py

Builds docs/Figures-code.pdf: the Figures source files, commented, in
reading order, with an introduction and a clickable table of contents.

    python3 docs/build/makeCodePdf.py

Not part of the app. Needs pygments and pypdf (Python) and Playwright
(Node); see pdfdoc.py.
"""

import html
import os
import subprocess
from datetime import date

from pygments import highlight
from pygments.formatters import HtmlFormatter
from pygments.lexers import JavascriptLexer

from pdfdoc import build_pdf, page_shell

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "docs", "Figures-code.pdf")

# Reading order, with a one-line role for the table of contents.
FILES = [
    ("ui/figures/figureModel.js",     "The figure as plain data"),
    ("ui/figures/figures.js",         "Entry point; where all the state lives"),
    ("ui/figures/figuresNav.js",      "Subtabs, the left-hand controls"),
    ("ui/figures/figureLayers.js",    "Insert, draw, select and hide layers"),
    ("draw/drawTransform.js",         "Moving and turning: the math"),
    ("ui/figures/figurePoints.js",    "Discs: data, finding, drawing"),
    ("ui/figures/figurePointer.js",   "The mouse and keys in points mode"),
    ("ui/figures/figureCentroid.js",  "Move and turn a whole layer"),
    ("ui/figures/figureWelds.js",     "Welds"),
    ("ui/figures/figuresCommands.js", "Commands panel and caption menu"),
    ("ui/figures/figuresDisplay.js",  "The saved-figure category list"),
    ("ui/figures/figuresState.js",    "Navigation bookkeeping"),
]
APPENDIX = [
    ("ui/interactor.js", "Handle dragging, shared with the Draw tab (not re-commented)"),
]


def anchor_of(path):
    return "f-" + os.path.basename(path).replace(".", "-")


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True).stdout.strip()


FORMATTER = HtmlFormatter(linenos="inline", style="default", cssclass="code", wrapcode=True)
EXTRA_CSS = FORMATTER.get_style_defs(".code") + """
/* Comments: dark green, upright, so the explanation reads as text. */
.code .c, .code .c1, .code .cm, .code .cs, .code .ch { color: #2e6b3a; font-style: normal; }
.code .linenos { color: #a3a9b4; padding-right: 1.2em; }
.code pre { background: none; border: 0; padding: 0; margin: 0;
            font-size: 8.2pt; line-height: 1.3; }
.code pre code { background: none; padding: 0; font-size: inherit;
                 line-height: inherit; border-radius: 0; }
.code span { line-height: inherit; }
"""


def code_section(path, role):
    src = open(os.path.join(ROOT, path), encoding="utf-8").read()
    lines = src.count("\n")
    a = anchor_of(path)
    name = os.path.basename(path)
    return (
        f"<div class='section' id='{a}'>"
        f"<div class='filehead'><h1>{html.escape(name)}</h1>"
        f"<span class='path'>{html.escape(path)} &middot; {lines} lines</span></div>"
        f"<p class='kicker'>{html.escape(role)}</p>"
        f"<p class='back'><a href='#contents'>&larr; Contents</a></p>"
        f"{highlight(src, JavascriptLexer(), FORMATTER)}"
        f"</div>"
    )


def files_table():
    rows = []
    for path, role in FILES + APPENDIX:
        n = open(os.path.join(ROOT, path), encoding="utf-8").read().count("\n")
        rows.append(f"<tr><td><a href='#{anchor_of(path)}'><code>{html.escape(path)}</code></a></td>"
                    f"<td>{html.escape(role)}</td><td style='text-align:right'>{n}</td></tr>")
    return ("<table class='files'><tr><th>File</th><th>What it does</th>"
            "<th style='text-align:right'>Lines</th></tr>" + "".join(rows) + "</table>")


INTRO = [
    ("i-read", "How to read this", """
<p>These are the source files of the Figures tab, Phases 5 to 8, with comments added for reading. The
comments changed; the code did not. Each file was checked by stripping its comments and comparing the
result, byte for byte, with the file before the comments were added.</p>
<p>Comments are set in <span style="color:#2e6b3a">dark green</span> so they read as text and the code
stands apart from them. Every file opens with a header that says what the file is for, what it must not
do, and what it exports; read the header first and the code after.</p>
<p>The files are in reading order, not alphabetical. The order follows the data: first what a figure
<em>is</em> (<code>figureModel.js</code>), then where it lives and how you get to it, then how its layers
are drawn, then the discs on those layers, then the two ways to move things, then welds, which tie the
rest together. The last three files are small and can be read in any order.</p>
<p>Every file entry in the contents is a link, and every file starts with a link back to the contents.
The PDF's bookmark panel lists the same entries.</p>
"""),
    ("i-glance", "The files at a glance", None),   # filled with files_table()
    ("i-walk", "Two actions, end to end", """
<p>The files make most sense once you have followed one thing the user does all the way through.</p>
<h3>Dragging a handle that is welded to another object</h3>
<ol>
<li><code>interactor.js</code> sees the press on a handle of the active object and starts a drag.</li>
<li>On each mouse move it calls <code>moveHandle()</code>, which first calls the layer's
<code>beforeMove</code> (set up in <code>insertLayer()</code>, <code>figureLayers.js</code>). That takes a
snapshot of where this layer's welded discs are (<code>snapshotWeldMembers</code>,
<code>figureWelds.js</code>).</li>
<li>The handle's position is written into <code>params.points</code>, mapped from the canvas to the
layer's own coordinates through its transform (<code>drawTransform.js</code>).</li>
<li><code>onUpdate</code> runs the object's own <code>update()</code> and then
<code>redrawFigure()</code>. Every layer redraws; <code>refreshPoints()</code> (<code>figurePoints.js</code>)
moves each anchored disc to its fraction along its arm, so the welded disc on this layer has now moved.</li>
<li><code>afterMove</code> calls <code>propagateAfterChange()</code>. It compares the snapshot with where
the discs are now, and for each one that moved, it moves the weld partners on other layers by the same
amount, choosing whether to move one handle, both ends of an arm, or the whole layer.</li>
<li>If anything followed, one more <code>refreshPoints()</code> and <code>redrawFigure()</code> show the
result.</li>
</ol>
<h3>A click in points mode</h3>
<ol>
<li><code>figurePointer.js</code> records where the left button went down, and whether that was on a
handle (then the interactor owns the press) or on a free disc (then a drag may move it).</li>
<li>On release, if it was a click: a disc of the active layer there is selected; failing that, an
infrastructure point within the hit radius is numbered as an anchored disc
(<code>findCandidate</code>, <code>addAnchoredPoint</code>); failing that, a free disc is placed.</li>
<li><code>redrawFigure()</code> draws it.</li>
</ol>
<p>A right-click goes to <code>toggleWeldAt()</code> in <code>figureWelds.js</code> instead, and only there.</p>
"""),
    ("i-idioms", "JavaScript you will meet", """
<p>The code is plain on purpose, but modern JavaScript has some short forms that recur. Each is
explained in a comment where it first appears in a file; this is the whole list in one place.</p>
<table>
<tr><th style="width:30%">Written</th><th>Means</th></tr>
<tr><td><code>a?.b</code></td><td>a.b, or undefined if a is missing (instead of an error)</td></tr>
<tr><td><code>a || b</code></td><td>a, unless a is empty (null, undefined, 0, "", false); then b</td></tr>
<tr><td><code>a ?? b</code></td><td>a, unless a is null or undefined; then b. Unlike ||, keeps a 0.</td></tr>
<tr><td><code>!!a</code></td><td>a turned into a plain true or false</td></tr>
<tr><td><code>a ? b : c</code></td><td>if a then b else c, as an expression</td></tr>
<tr><td><code>(x) =&gt; x + 1</code></td><td>a small function written in place ("arrow function")</td></tr>
<tr><td><code>`text ${x}`</code></td><td>a string with x filled in (backquotes)</td></tr>
<tr><td><code>const { a, b } = obj</code></td><td>a = obj.a and b = obj.b, in one line</td></tr>
<tr><td><code>for (const [a, b] of list)</code></td><td>walk a list of pairs, naming both halves</td></tr>
<tr><td><code>{ ...obj }</code>, <code>[x, ...list]</code></td><td>a copy of obj; a new list with x first, then list</td></tr>
<tr><td><code>for (k in obj)</code> / <code>for (v of list)</code></td><td>walk an object's keys / a list's values</td></tr>
<tr><td><code>new Set()</code>, <code>new Map()</code></td><td>a collection of unique values / a lookup table</td></tr>
<tr><td><code>list.filter(...)</code>, <code>.map(...)</code>, <code>.find(...)</code>, <code>.every(...)</code></td>
    <td>keep the matching items / transform each / the first match / true if all match</td></tr>
<tr><td><code>structuredClone(obj)</code></td><td>a deep copy: nothing nested is shared</td></tr>
<tr><td><code>Object.create(entry)</code></td><td>a new object that falls back on entry for anything it lacks; how each layer
    gets its own params but shares the registry object's functions</td></tr>
<tr><td><code>async</code> / <code>await</code></td><td>wait for a slow answer (a file fetch) without freezing the page</td></tr>
<tr><td><code>import("...")</code> in a function</td><td>load a module only when it is first needed</td></tr>
<tr><td><code>new AbortController()</code>, <code>{ signal }</code></td><td>every listener registered with the signal is
    removed by one <code>abort()</code></td></tr>
<tr><td>a function that uses a variable from around it</td><td>a "closure": it keeps that variable alive and
    private (each layer's <code>weldSnapshot</code>)</td></tr>
</table>
"""),
]


def make_html(toc):
    today = date.today().strftime("%d %B %Y").lstrip("0")
    commit = git("rev-parse", "--short", "HEAD")
    branch = git("rev-parse", "--abbrev-ref", "HEAD")
    parts = [
        "<div class='cover'><div class='kicker'>Sketchpad</div>"
        "<h1>The Figures code, commented</h1>"
        "<div class='sub'>Phases 5 to 8: figures, layers, discs, moving and turning, welds</div>"
        f"<div class='meta'>Built {today} from {html.escape(branch)} at {html.escape(commit)}.<br>"
        "Twelve files, in reading order, with an introduction.</div></div>",
        f"<div class='section' id='contents'><h1>Contents</h1>{toc}</div>",
    ]
    for a, title, body in INTRO:
        content = files_table() if body is None else body
        parts.append(f"<div class='section' id='{a}'><h1>{html.escape(title)}</h1>{content}</div>")
    for path, role in FILES:
        parts.append(code_section(path, role))
    for path, role in APPENDIX:
        parts.append(code_section(path, "Appendix. " + role))
    return page_shell("Sketchpad: the Figures code", "".join(parts), EXTRA_CSS)


def main():
    entries = [("group", "Before the code")]
    heading = {}
    for a, title, _ in INTRO:
        entries.append(("row", a, title, ""))
        heading[a] = title
    entries.append(("group", "The files, in reading order"))
    for path, role in FILES:
        entries.append(("row", anchor_of(path), os.path.basename(path), role))
        heading[anchor_of(path)] = os.path.basename(path)
    entries.append(("group", "Appendix"))
    for path, role in APPENDIX:
        entries.append(("row", anchor_of(path), os.path.basename(path), role))
        heading[anchor_of(path)] = os.path.basename(path)
    pages = build_pdf(make_html, entries, heading, OUT, "Sketchpad · The Figures code, commented")
    print("wrote", OUT, pages)


if __name__ == "__main__":
    main()
