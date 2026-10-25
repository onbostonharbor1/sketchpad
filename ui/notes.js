/* ui/notes.js
   ------------------------------------------------------------
   Header notes: the descriptive comment at the top of a source file.

   extractHeaderNotes(text) returns the text of the first comment in
   the file, or "" when the file has no real notes. The first comment
   is either a block comment or a run of leading double-slash lines. A first
   line that is only the file's own path (for example
   "drawRegistry/cycloid.js") and lines made only of rule characters
   (=, -, *) are dropped, so a file whose only header is its path
   counts as having no notes.

   Pure text in, text out: no DOM, no fetch.
   ------------------------------------------------------------ */

const PATH_LINE = /^[\w.\/\\-]+\.m?js$/;
const RULE_LINE = /^[=\-*_#\s]*$/;

export function extractHeaderNotes(text) {

  if (typeof text !== "string") return "";

  let src = text.replace(/^﻿/, "").trimStart();
  let lines = [];

  if (src.startsWith("/*")) {
    const end = src.indexOf("*/");
    if (end < 0) return "";
    lines = src.slice(2, end).split("\n");
  } else if (src.startsWith("//")) {
    for (const raw of src.split("\n")) {
      const t = raw.trim();
      if (!t.startsWith("//")) break;
      lines.push(t.replace(/^\/\/ ?/, ""));
    }
  } else {
    return "";
  }

  // Drop a leading line that is just the file path
  while (lines.length > 0 && lines[0].trim() === "") lines.shift();
  if (lines.length > 0 && PATH_LINE.test(lines[0].trim())) lines.shift();

  // Drop pure rule lines, strip a leading "*" used for block-comment margins
  lines = lines
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => !RULE_LINE.test(l) || l.trim() === "");

  // Remove common indentation
  let indent = Infinity;
  for (const l of lines) {
    if (l.trim() === "") continue;
    indent = Math.min(indent, l.match(/^\s*/)[0].length);
  }
  if (indent === Infinity) indent = 0;
  lines = lines.map((l) => l.slice(Math.min(indent, l.length)));

  return lines.join("\n").replace(/^\n+|\n+$/g, "");

} // end extractHeaderNotes


/* ------------------------------------------------------------
   reflowNotes(text)
   ------------------------------------------------------------
   Header notes are hard-wrapped for the editor. For display, join
   the lines of each paragraph (paragraphs are separated by blank
   lines) so the text wraps to the popup's width. Lines that start
   a list item ("-", "*", "1.") or are indented keep their line
   breaks.
   ------------------------------------------------------------ */
export function reflowNotes(text) {

  const out = [];

  for (const para of String(text).split(/\n\s*\n/)) {
    let current = "";
    for (const line of para.split("\n")) {
      const keepBreak = /^(\s+|[-*] |\d+[.)] )/.test(line);
      if (current === "") {
        current = line;
      } else if (keepBreak) {
        current += "\n" + line;
      } else {
        current += " " + line.trim();
      }
    }
    out.push(current);
  }

  return out.join("\n\n");

} // end reflowNotes
