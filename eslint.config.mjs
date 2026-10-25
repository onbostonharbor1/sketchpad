/* eslint.config.mjs
   ------------------------------------------------------------
   Globals report only. The one rule, no-undef, lists every name a
   file uses that is not declared, imported, or a known browser
   global. It is a "warn", so `npm run lint:globals` prints the list
   and never fails the build.

   Known and intentional (see the globals notes in draw/drawState.js
   and ui/uiState.js): uiState, ctx, bootstrap, jQuery, $, Coloris.
   Anything else in the report is worth a look.
   ------------------------------------------------------------ */
import globals from "globals";

export default [
  {
    // draw/zz*.js are parked archive files; zzFindBezierPoint.js is not valid JS
    ignores: ["node_modules/**", "dist/**", "archive/**", "**/archive/**", "draw/zz*.js"]
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.browser,
        // Declared by the app or loaded by script tags
        uiState:   "readonly",
        ctx:       "readonly",
        bootstrap: "readonly",
        jQuery:    "readonly",
        $:         "readonly",
        Coloris:   "readonly"
      }
    },
    rules: {
      "no-undef": "warn"
    }
  }
];
