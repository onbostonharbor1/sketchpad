/* ===========================================================
   regions.js
   -----------------------------------------------------------
   The regions of index.html that tabs fill, and what happens to
   each when a tab is left. clearDivs() in uiUtilities.js reads
   this table; tests/idCheck.mjs checks that every id here is
   written in index.html.

   clear values:
     "empty-show"  remove the contents, remove any inline display
                   setting (so the CSS decides)
     "empty-hide"  remove the contents and hide the region
     "empty"       remove the contents only
     "hide"        hide the region; a tab must show it again
   =========================================================== */

export const REGIONS = [
  { id: "action",            clear: "empty-show" },   // parameter controls, thumbnails
  { id: "caption",           clear: "empty-show" },
  { id: "text",              clear: "empty-show" },   // lists, categories, results
  { id: "sketchpad",         clear: "empty-show" },   // hosts the drawing canvas
  { id: "figure-sidebar",    clear: "empty-hide" },   // Figures only
  { id: "interface-controls", clear: "empty" },
  { id: "sketchpad-wrapper", clear: "hide" },
];

// Per-tab additions to the permanent #button region carry this class.
export const BUTTON_EXTRA_SELECTOR = "#button .tab-extra";
