/* ===========================================================
   htmlText.js
   -----------------------------------------------------------
   Text helpers for building HTML strings.
   =========================================================== */

export function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
} // end escapeHtml
