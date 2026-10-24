/* createFigureService.mjs
   ============================================================
   Node service handler for the Create Figure feature.

   Exported:
     createFigure(payload)

   Payload shape:
     {
       figureName    : "My Figure",
       category      : "Spirals",
       isNewCategory : false,
       objects       : [
         { id: "regularPolygon", params: { ... }, count: 1 },
         { id: "nautilus",       params: { ... }, count: 2 }
       ]
     }

   Returns:
     { status: "ok",  figurePath, manifestPath, category, filename }
     { status: "error", message: "..." }
   ============================================================ */

import fs   from "fs";
import path from "path";


/* ============================================================
   createFigure(payload)
   ============================================================ */
export async function createFigure(payload = {}) {
  try {
    const { figureName, category, isNewCategory, objects } = payload;

    // -- Validate payload ------------------------------------------
    if (typeof figureName !== "string" || figureName.trim() === "") {
      throw new Error("createFigure: figureName missing/invalid");
    }
    if (typeof category !== "string" || category.trim() === "") {
      throw new Error("createFigure: category missing/invalid");
    }
    if (!Array.isArray(objects) || objects.length === 0) {
      throw new Error("createFigure: objects must be a non-empty array");
    }

    const figuresRoot = path.resolve("./figures");
    assertDirectoryExists(figuresRoot, "createFigure: figures root missing: " + figuresRoot);

    // Derive filesystem-safe names
    const categoryDirName = toSafeName(category);
    const figureBaseName  = toSafeName(figureName);
    const figureFilename  = figureBaseName + ".js";

    // -- Branch B: new category ------------------------------------
    if (isNewCategory) {
      await createNewCategory(figuresRoot, category, categoryDirName);
    }

    const categoryDir    = path.join(figuresRoot, categoryDirName);
    const manifestPath   = path.join(categoryDir, "manifest.json");

    assertDirectoryExists(categoryDir,  "createFigure: category dir missing: " + categoryDir);
    assertFileExists(manifestPath,      "createFigure: manifest missing: "     + manifestPath);

    // -- Branch A: write figure file -------------------------------
    const figurePath = path.join(categoryDir, figureFilename);
    const scriptText = buildFigureScript(objects);

    fs.writeFileSync(figurePath, scriptText, "utf8");
    assertFileExists(figurePath, "createFigure: figure write failed: " + figurePath);

    // -- Update manifest -------------------------------------------
    const manifest = readJsonFileSync(manifestPath);
    if (!Array.isArray(manifest)) {
      throw new Error("createFigure: manifest is not an array: " + manifestPath);
    }

    manifest.push({
      filename: figureBaseName,
      path:     figureFilename,
      title:    figureName,
      status:   "new"
    });

    writeJsonFileSync(manifestPath, manifest);

    return {
      request:      "createFigure",
      status:       "ok",
      category,
      categoryDir:  categoryDirName,
      filename:     figureBaseName,
      figurePath,
      manifestPath
    };

  } catch (err) {
    console.error("createFigure ERROR:", err.message);
    return {
      request: "createFigure",
      status:  "error",
      message: err.message
    };
  }

} // end createFigure


/* ============================================================
   createNewCategory(figuresRoot, categoryName, categoryDirName)
   ============================================================
   Branch B — executed before Branch A when isNewCategory is true.

   1. Create figures/<categoryDirName>/
   2. Append categoryName to figures/directoryRegistry.json, sort, rewrite
   3. Write empty figures/<categoryDirName>/manifest.json
   4. Create help/figures/<categoryDirName>/
   ============================================================ */
async function createNewCategory(figuresRoot, categoryName, categoryDirName) {

  // 1. Create category directory
  const categoryDir = path.join(figuresRoot, categoryDirName);
  fs.mkdirSync(categoryDir, { recursive: true });

  // 2. Update directoryRegistry.json
  const registryPath = path.join(figuresRoot, "directoryRegistry.json");
  assertFileExists(registryPath, "createNewCategory: directoryRegistry.json missing: " + registryPath);

  const registry = readJsonFileSync(registryPath);
  if (!Array.isArray(registry)) {
    throw new Error("createNewCategory: directoryRegistry.json must be an array");
  }

  if (!registry.includes(categoryName)) {
    registry.push(categoryName);
    registry.sort((a, b) => a.localeCompare(b));
    writeJsonFileSync(registryPath, registry);
  }

  // 3. Write empty manifest.json
  const manifestPath = path.join(categoryDir, "manifest.json");
  writeJsonFileSync(manifestPath, []);

  // 4. Create help directory mirror
  const helpDir = path.resolve(path.join("./help", "figures", categoryDirName));
  fs.mkdirSync(helpDir, { recursive: true });

} // end createNewCategory


/* ============================================================
   buildFigureScript(objects)
   ============================================================
   Generates the ES module source for a figure file.

   Each object in the objects array is expanded by its count,
   with positional offsets of 40px per copy index applied to
   the first recognised position param found:
     midpoint.x/y → points[0].x/y → centerX/centerY → startX/startY → x/y
   points[] is always stripped from the written params — it is runtime
   state reinitialised by each draw object's init().

   Returns a string containing the complete file.
   ============================================================ */
function buildFigureScript(objects) {

  const entries = [];

  for (const obj of objects) {
    const count  = (typeof obj.count === "number" && obj.count >= 1)
                   ? Math.floor(obj.count) : 1;
    const params = obj.params || {};

    for (let i = 0; i < count; i++) {
      // Deep-copy one level so nested objects (e.g. midpoint) are not shared
      const p = {};
      for (const k of Object.keys(params)) {
        const v = params[k];
        p[k] = (v !== null && typeof v === "object" && !Array.isArray(v))
               ? Object.assign({}, v)
               : v;
      }

      if (i === 0) {
        // Ensure copy 1 has an explicit midpoint so position is param-driven
        // in the runner, not hardcoded in init(). Derive from points[0] if
        // available, otherwise use canvas centre as default.
        if (!p.midpoint) {
          const pt = Array.isArray(p.points) && p.points[0];
          p.midpoint = pt
            ? { x: pt.x, y: pt.y }
            : { x: 300, y: 300 };
        }
      }

      if (i > 0) {
        const offset = i * 40;
        if (p.midpoint && typeof p.midpoint.x === "number") {
          // Most draw objects: { midpoint: { x, y } }
          p.midpoint.x = p.midpoint.x + offset;
          p.midpoint.y = p.midpoint.y + offset;
        } else if (Array.isArray(p.points) && p.points[0] &&
                   typeof p.points[0].x === "number") {
          // e.g. regularPolygon: position is points[0]
          p.points[0].x = p.points[0].x + offset;
          p.points[0].y = p.points[0].y + offset;
        } else if ("centerX" in p && "centerY" in p) {
          p.centerX = (p.centerX || 0) + offset;
          p.centerY = (p.centerY || 0) + offset;
        } else if ("startX" in p && "startY" in p) {
          p.startX = (p.startX || 0) + offset;
          p.startY = (p.startY || 0) + offset;
        } else if ("x" in p && "y" in p) {
          p.x = (p.x || 0) + offset;
          p.y = (p.y || 0) + offset;
        }
      }

      // points[] is runtime state — always drop it from the written file.
      // The draw object's init() reinitialises it from midpoint or points[0].
      delete p.points;

      entries.push({ id: obj.id, params: p });
    }
  }

  const entriesJson = JSON.stringify(entries, null, 4)
    .split("\n")
    .map((line, i) => i === 0 ? "  const objects = " + line : "  " + line)
    .join("\n");

  return [
    `/* Auto-generated figure */`,
    `export async function runFigure() {`,
    `${entriesJson};`,
    `  return objects;`,
    `}`,
    ``
  ].join("\n");

} // end buildFigureScript


/* ============================================================
   Helpers
   ============================================================ */

function toSafeName(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
} // end toSafeName

function readJsonFileSync(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
} // end readJsonFileSync

function writeJsonFileSync(filePath, data) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2) + "\n",
    "utf8"
  );
} // end writeJsonFileSync

function assertDirectoryExists(dir, message) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(message);
  }
} // end assertDirectoryExists

function assertFileExists(file, message) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(message);
  }
} // end assertFileExists
