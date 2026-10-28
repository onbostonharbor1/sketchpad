/* docs/build/render.mjs
   ------------------------------------------------------------
   Renders one HTML file to a PDF with headless Chromium (Playwright).
   Used by makeCodePdf.py and makeHelpPdf.py; not part of the app.

     node docs/build/render.mjs <in.html> <out.pdf> "<footer title>"

   outline: true turns the HTML headings (h1, h2 ...) into the PDF's
   bookmark panel. Links inside the page (<a href="#id">) stay
   clickable in the PDF. The footer carries the title and page number.
   ------------------------------------------------------------ */

import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require("/opt/npm-tools/node_modules/playwright"));
}

const [, , inHtml, outPdf, title = ""] = process.argv;

const browser = await chromium.launch();
const page    = await browser.newPage();
await page.goto("file://" + path.resolve(inHtml), { waitUntil: "load" });

await page.pdf({
  path: outPdf,
  format: "Letter",
  printBackground: true,
  outline: true,
  tagged: true,
  margin: { top: "0.6in", bottom: "0.7in", left: "0.6in", right: "0.6in" },
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    `<div style="font-family:Inter,DejaVu Sans,sans-serif;font-size:8px;color:#777;` +
    `width:100%;padding:0 0.6in;display:flex;justify-content:space-between;">` +
    `<span>${title}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`
});

await browser.close();
