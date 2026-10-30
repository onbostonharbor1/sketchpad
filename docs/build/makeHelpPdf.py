"""docs/build/makeHelpPdf.py

Builds docs/Help-Overview.pdf: every page under help/Overview (Tabs,
Subsystems, Design Notes) with an introduction and a clickable table of
contents, one entry per page.

    python3 docs/build/makeHelpPdf.py

Not part of the app. Needs pypdf (Python) and Playwright (Node); see
pdfdoc.py.
"""

import html
import os
import re
import subprocess
from datetime import date

from pdfdoc import build_pdf, page_shell

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
HELP = os.path.join(ROOT, "help", "Overview")
OUT = os.path.join(ROOT, "docs", "Help-Overview.pdf")

# Reading order within each group. Any page not listed is added at the end
# of its group, so a new page is never silently left out.
ORDER = {
    "Tabs": ["figures", "home", "draw", "patterns", "gallery", "utilities"],
    "Subsystems": ["setUI", "uiState", "ui_utilities", "manifest", "fileLayer", "nodeLayer",
                   "categories", "caption", "menuManager", "overlay", "interactor",
                   "pointDragging", "parameterControls", "parameterControls2",
                   "GROUPING_SYSTEM_GUIDE", "scriptRunner"],
    "Design Notes": ["sketchpadArchitecture", "dataFlow", "drawRegistry", "runPattern",
                     "ConvertToGallery", "coding_simplicity", "figuresUndo"],
}
GROUP_LABEL = {"Tabs": "Tabs", "Subsystems": "Subsystems", "Design Notes": "Design Notes"}
NEW_PAGES = {"figures", "pointDragging", "figuresUndo"}

EXTRA_CSS = """
.mono { font-family: "DejaVu Sans Mono", monospace; font-size: 8.8pt; }
.warn { background: #fdecec; border-left: 3px solid #d98b8b; padding: 6pt 9pt; margin: 6pt 0 10pt; }
.ok { background: #ecf7ee; border-left: 3px solid #8cc59a; padding: 6pt 9pt; margin: 6pt 0 10pt; }
.small { font-size: 9.5pt; }
.indent { margin-left: 14pt; }
.flow-diagram { background: #eef5f9; border-left: 3px solid #6aa3c8; padding: 6pt 9pt;
                font-family: "DejaVu Sans Mono", monospace; white-space: pre-wrap; font-size: 8.6pt; }
dl dt { margin-top: 6pt; }
dl dd { margin: 2pt 0 4pt 14pt; }
.newtag { font-family: Inter, sans-serif; font-size: 8pt; color: #fff; background: #1565c0;
          border-radius: 3px; padding: 0 4px; margin-left: 4pt; vertical-align: middle; }
"""


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True).stdout.strip()


def pages_in(group):
    folder = os.path.join(HELP, group)
    names = sorted(f[:-5] for f in os.listdir(folder) if f.endswith(".html"))
    ordered = [n for n in ORDER[group] if n in names]
    return ordered + [n for n in names if n not in ordered]


def clean_title(t):
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"^Help Treatise\s*[—-]\s*", "", t)
    return t


def read_page(group, name):
    src = open(os.path.join(HELP, group, name + ".html"), encoding="utf-8").read()
    m = re.search(r"<title>(.*?)</title>", src, re.S)
    title = clean_title(html.unescape(m.group(1))) if m else name
    body = re.search(r"<body[^>]*>(.*)</body>", src, re.S).group(1)
    body = re.sub(r"<script.*?</script>", "", body, flags=re.S)
    # The section heading is the page's title, so drop the page's own first
    # h1 and push every other heading one level down.
    # (The first h1 may come after a dated note, so it is found anywhere.)
    body = re.sub(r"<h1[^>]*>.*?</h1>", "", body, count=1, flags=re.S)
    for lvl in (5, 4, 3, 2, 1):
        body = re.sub(rf"<(/?)h{lvl}([ >])", rf"<\1h{lvl + 1}\2", body)
    return title, body


def anchor(group, name):
    return "p-" + re.sub(r"[^A-Za-z0-9]", "-", group + "-" + name)


INTRO_ABOUT = """
<p>This is the <code>help/Overview</code> section of Sketchpad's help, all pages in one document. In the app
the same pages open from the Help browser (Commands &rarr; Help).</p>
<p><strong>What changed on 27 October 2026.</strong> Every page was read against the code as it stands after
Phase 8 (welds). Each page now opens with a yellow note saying when it was checked and what changed:</p>
<ul>
<li><strong>Rewritten</strong> where the code had moved on: the five tab pages (each tab is now several files),
  and most subsystem pages (handles, tab switching, overlays, menus, parameter controls, file paths).</li>
<li><strong>Corrected in place</strong> where the page was right in substance: the manifest system, the script
  runner, categories, the Node bridge, the design notes.</li>
<li><strong>New</strong> (marked <span class="newtag">NEW</span> in the contents): a first discussion of the Figures tab
  with the phase list, a page on point dragging, and a proposal for undo in Figures.</li>
</ul>
<p><strong>Suggested reading.</strong> Start with <em>Figures Tab — A First Discussion</em>, then <em>Point
Dragging</em>, then <em>Switching Tabs</em> and <em>uiState</em>. The design notes can be read in any order.
A separate document, <em>The Figures code, commented</em>, has the Figures source files themselves.</p>
"""

INTRO_FOUND = """
<p>Checking the pages against the code turned up a few things in the code itself. When this list was first
written (27 October 2026) none of them had been changed. Rows marked <b>Fixed 31 October 2026</b> were changed
on the branch <code>claude/sweep-1</code>; the others are still open, for a decision.</p>
<table>
<tr><th style="width:30%">Where</th><th>What</th><th style="width:18%">Kind</th></tr>
<tr><td>Figures: weld mark</td><td>The + is drawn under the handle dot, so a weld on a handle shows only a white
  ring.</td><td>Visible bug</td></tr>
<tr><td>Figures: centroid</td><td>A right-press on the diamond starts a move (the button is not checked).</td>
  <td>Small bug</td></tr>
<tr><td>Utilities</td><td>Leaving while on Result and coming back re-ran the script but hid the Result subtab
  (confirmed in the running app).</td><td>Fixed 31 October 2026</td></tr>
<tr><td><code>setUI.js</code></td><td>No tab's <code>save()</code> is ever called; Draw, Utilities and Figures therefore
  always re-init (harmless: they return to where they were). End-of-work items 4 and 6 in
  <code>PHASES.md</code>.</td><td>Design loose end</td></tr>
<tr><td><code>caption.js</code></td><td><code>buildMenuHandler</code> called the menu with the wrong arguments; it and two
  other helpers were unused. Removed.</td><td>Fixed 31 October 2026</td></tr>
<tr><td><code>categories.js</code></td><td><code>buildCategoryDescriptor</code> passed a label function to <code>sort()</code>;
  it left the order unchanged, which Patterns relies on. Now a plain copy, same order.</td><td>Fixed 31 October 2026</td></tr>
<tr><td><code>scriptRunner.js</code></td><td>Its header said <code>runPattern(ctx)</code> receives the context; the code
  never passed it. Header corrected; the unused <code>render()</code> fallback was removed too.</td><td>Fixed 31 October 2026</td></tr>
<tr><td><code>manifest.js</code></td><td>A <code>drawRegistry</code> branch that nothing reaches and that would find
  nothing.</td><td>Dead code</td></tr>
<tr><td>Assorted</td><td><code>actionRegistry.js</code>'s table, <code>clearHomeCanvasAndOverlays</code>,
  <code>rebuildAllSystemCaches</code>, <code>setCommandsButton</code>, <code>clearOverlaysForTabSwitch</code>, the fileLayer
  normalizers and <code>rehydrateGalleryState</code> were exported and never called. Removed
  (<code>saveUtilityState</code> stays: it is wired into the tab but <code>setUI</code> never calls it, see above).</td><td>Fixed 31 October 2026</td></tr>
<tr><td>Parameter controls</td><td>The point-picker widgets are switched off, but <code>boxes</code> and
  <code>regularPursuit</code> still declare one (it shows as a plain text box).</td><td>Leftover</td></tr>
</table>
"""

INTRO = [("i-about", "About this collection", INTRO_ABOUT),
         ("i-found", "Things found while checking", INTRO_FOUND)]


def main():
    groups = [(g, pages_in(g)) for g in ("Tabs", "Subsystems", "Design Notes")]
    loaded = {(g, n): read_page(g, n) for g, names in groups for n in names}

    entries = [("group", "Before the pages")]
    heading = {}
    for a, t, _ in INTRO:
        entries.append(("row", a, t, ""))
        heading[a] = t
    for g, names in groups:
        entries.append(("group", GROUP_LABEL[g]))
        for n in names:
            title = loaded[(g, n)][0]
            entries.append(("row", anchor(g, n), title, "new" if n in NEW_PAGES else ""))
            heading[anchor(g, n)] = title

    def make_html(toc):
        today = date.today().strftime("%d %B %Y").lstrip("0")
        commit = git("rev-parse", "--short", "HEAD")
        branch = git("rev-parse", "--abbrev-ref", "HEAD")
        count = sum(len(n) for _, n in groups)
        toc = toc.replace("<span class='desc'>new</span>", "<span class='newtag'>NEW</span>")
        parts = [
            "<div class='cover'><div class='kicker'>Sketchpad Help</div>"
            "<h1>Overview: Tabs, Subsystems, Design Notes</h1>"
            "<div class='sub'>Checked against the code after Phase 8, with three new pages</div>"
            f"<div class='meta'>Built {today} from {html.escape(branch)} at {html.escape(commit)}.<br>"
            f"{count} pages, from <code>help/Overview</code>.</div></div>",
            f"<div class='section' id='contents'><h1>Contents</h1>{toc}</div>",
        ]
        for a, t, body in INTRO:
            parts.append(f"<div class='section' id='{a}'><h1>{html.escape(t)}</h1>{body}</div>")
        for g, names in groups:
            for n in names:
                title, body = loaded[(g, n)]
                tag = " <span class='newtag'>NEW</span>" if n in NEW_PAGES else ""
                parts.append(
                    f"<div class='section' id='{anchor(g, n)}'>"
                    f"<div class='kicker'>{html.escape(GROUP_LABEL[g])} &middot; {html.escape(n)}.html</div>"
                    f"<h1>{html.escape(title)}</h1>{tag}"
                    f"<p class='back'><a href='#contents'>&larr; Contents</a></p>"
                    f"{body}</div>")
        return page_shell("Sketchpad Help: Overview", "".join(parts), EXTRA_CSS)

    pages = build_pdf(make_html, entries, heading, OUT, "Sketchpad Help · Overview")
    print("wrote", OUT, len(pages), "sections")


if __name__ == "__main__":
    main()
