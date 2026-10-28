"""docs/build/pdfdoc.py

Shared pieces for the two documentation PDFs (makeCodePdf.py,
makeHelpPdf.py). Not part of the app.

build_pdf() renders the HTML twice. The first pass gives a PDF whose
bookmarks (from the headings) say which page each section starts on;
those page numbers are then written into the table of contents and the
document is rendered again. The TOC lines have the same layout either
way, so adding the numbers never moves anything to another page.

Needs: Python 3 with pypdf, Node with Playwright (render.mjs).
"""

import html
import os
import subprocess
import tempfile

from pypdf import PdfReader

HERE = os.path.dirname(os.path.abspath(__file__))

CSS = """
@page { size: Letter; }
:root { --ink:#1d1f23; --muted:#5b6170; --rule:#d9dce3; --accent:#1565c0;
        --code-bg:#f7f7f9; --note-bg:#fff8e1; --note-rule:#e8c25a; }
* { box-sizing: border-box; }
body { font-family: "Bitstream Charter", "DejaVu Serif", Georgia, serif;
       font-size: 10.5pt; line-height: 1.45; color: var(--ink); margin: 0; }
h1, h2, h3, h4, .toc, .cover, .kicker, table.files th, .filehead
     { font-family: Inter, "DejaVu Sans", sans-serif; }
h1 { font-size: 20pt; margin: 0 0 6pt; letter-spacing: -0.01em; }
h2 { font-size: 14pt; margin: 18pt 0 6pt; padding-top: 8pt;
     border-top: 1px solid var(--rule); }
h3 { font-size: 11.5pt; margin: 14pt 0 4pt; }
h4 { font-size: 10.5pt; margin: 10pt 0 2pt; }
p { margin: 0 0 7pt; }
ul, ol { margin: 0 0 8pt 18pt; padding: 0; }
li { margin: 2pt 0; }
a { color: var(--accent); text-decoration: none; }
code { font-family: "DejaVu Sans Mono", monospace; font-size: 8.8pt;
       background: var(--code-bg); padding: 0 2px; border-radius: 2px; }
pre { font-family: "DejaVu Sans Mono", monospace; font-size: 8.4pt;
      background: var(--code-bg); border: 1px solid var(--rule);
      padding: 6pt 8pt; white-space: pre-wrap; word-break: break-word; }
table { border-collapse: collapse; width: 100%; margin: 4pt 0 10pt; font-size: 9.5pt; }
th, td { text-align: left; vertical-align: top; padding: 3pt 6pt;
         border-bottom: 1px solid var(--rule); }
th { font-size: 9pt; color: var(--muted); font-weight: 600; }
.note, .callout { background: var(--note-bg); border-left: 3px solid var(--note-rule);
        padding: 6pt 9pt; margin: 6pt 0 10pt; }
.hr { border-top: 1px solid var(--rule); margin: 10pt 0; }
.section { break-before: page; }
.cover { padding-top: 2.2in; }
.cover h1 { font-size: 28pt; }
.cover .sub { font-size: 13pt; color: var(--muted); margin-bottom: 24pt; }
.cover .meta { font-size: 9.5pt; color: var(--muted); }
.kicker { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.08em;
          color: var(--muted); margin-bottom: 2pt; }
.toc { font-size: 10.5pt; }
.toc .group { font-weight: 700; margin: 12pt 0 3pt; font-size: 10pt;
              color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
.toc .row { display: flex; align-items: baseline; margin: 2.5pt 0; }
.toc .row a { color: var(--ink); }
.toc .row .lead { flex: 1; border-bottom: 1px dotted #b8bcc6; margin: 0 6pt;
                  transform: translateY(-3pt); }
.toc .row .pg { width: 3em; text-align: right; color: var(--muted); }
.toc .row .desc { color: var(--muted); font-size: 9pt; margin-left: 6pt; }
.filehead { display: flex; justify-content: space-between; align-items: baseline;
            border-bottom: 2px solid var(--ink); padding-bottom: 3pt; margin-bottom: 8pt; }
.filehead .path { font-size: 9pt; color: var(--muted); }
.back { font-family: Inter, sans-serif; font-size: 8.5pt; }
/* Pygments output */
.code { font-family: "DejaVu Sans Mono", monospace; font-size: 8.2pt; line-height: 1.32; }
.code table { width: 100%; border: 0; margin: 0; font-size: 7.6pt; }
.code td { border: 0; padding: 0; }
.code td.linenos { width: 1%; text-align: right; color: #9aa0ab; padding-right: 8pt;
                   user-select: none; border-right: 1px solid var(--rule); }
.code td.code { padding-left: 8pt; }
.code pre { background: none; border: 0; padding: 0; margin: 0; font-size: 7.6pt;
            white-space: pre-wrap; word-break: break-word; line-height: 1.32; }
.code .linenos pre { white-space: pre; }
"""


def page_shell(title, body, extra_css=""):
    return (
        "<!doctype html><html><head><meta charset='utf-8'>"
        f"<title>{html.escape(title)}</title><style>{CSS}{extra_css}</style>"
        f"</head><body>{body}</body></html>"
    )


def toc_html(entries, pages=None):
    """entries: list of ("group", label) or ("row", anchor, label, desc).
    pages: {anchor: page number} or None (first pass: blank numbers)."""
    out = ["<div class='toc'>"]
    for e in entries:
        if e[0] == "group":
            out.append(f"<div class='group'>{html.escape(e[1])}</div>")
            continue
        _, anchor, label, desc = e
        pg = "" if pages is None else str(pages.get(anchor, ""))
        d = f"<span class='desc'>{html.escape(desc)}</span>" if desc else ""
        out.append(
            f"<div class='row'><a href='#{anchor}'>{html.escape(label)}</a>{d}"
            f"<span class='lead'></span><span class='pg'>{pg}</span></div>"
        )
    out.append("</div>")
    return "".join(out)


def _render(html_text, pdf_path, footer):
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as f:
        f.write(html_text)
        tmp = f.name
    try:
        subprocess.run(["node", os.path.join(HERE, "render.mjs"), tmp, pdf_path, footer],
                       check=True)
    finally:
        os.unlink(tmp)


def _outline_pages(pdf_path):
    """{bookmark title: 1-based page} for every bookmark, at any depth."""
    reader = PdfReader(pdf_path)
    found = {}

    def walk(items):
        for it in items:
            if isinstance(it, list):
                walk(it)
            else:
                found.setdefault(it.title.strip(), reader.get_destination_page_number(it) + 1)
    walk(reader.outline)
    return found


def build_pdf(make_html, entries, heading_of, pdf_path, footer):
    """make_html(toc_markup) -> full HTML. heading_of: {anchor: the exact
    text of that section's first heading}, used to find its page."""
    _render(make_html(toc_html(entries)), pdf_path, footer)
    by_title = _outline_pages(pdf_path)
    pages = {a: by_title.get(h.strip(), "") for a, h in heading_of.items()}
    missing = [a for a, p in pages.items() if p == ""]
    if missing:
        raise SystemExit("no bookmark found for: " + ", ".join(missing))
    _render(make_html(toc_html(entries, pages)), pdf_path, footer)
    return pages
