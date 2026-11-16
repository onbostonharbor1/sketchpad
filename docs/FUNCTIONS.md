# Function dictionary

Made by `npm run dictionary` from the comments above each function (tests/functionDictionary.mjs). Do not edit by hand: change the comment, then run it again.

787 functions in ui, draw, classes, drawRegistry, node; 1 without a comment above them.

| Function | Where | What it does |
|---|---|---|
| `_m` | draw/drawUtilities.js:498 | the point half way between a and b (short name for midpoint). |
| `acknowledge` | ui/errorChecklist.js:94 | write "Acknowledged: <key>" to today's error log. |
| `activateCentroid` | ui/figures/figureCentroid.js:219 | Starts listening. |
| `activateGallerySubtab` | ui/gallery/galleryNav.js:176 | marks one Gallery subtab as active. |
| `activateHomeSubtabButton` | ui/home/homeNav.js:135 | marks the subtab for a view as active. |
| `activatePointPicker` | ui/interactor.js:119 | CORE PICKER LOGIC |
| `activatePointsInput` | ui/figures/figurePointer.js:156 | redraw() redraws the whole figure. |
| `activateSubtab` | ui/resultsViewController.js:98 | Applies "active" CSS class to the button matching activeId and removes it from all others within the subtab bar. |
| `activateTab` | ui/setUI.js:113 | shows a tab by the decision order: needsUpdate, then init; else saved, then restore; else init. |
| `activateUtilitySubtab` | ui/utilities/utilitiesNav.js:95 | marks one Utilities subtab as active. |
| `activateWithReport` | ui/setUI.js:169 | Stage names the step that was running if something throws, so a failure at startup says where, not just what. |
| `addAnchoredPoint` | ui/figures/figurePoints.js:250 | Allocate the next number and add the point. |
| `addCaptionTools` | ui/figures/figuresNav.js:184 | Puts the figure's tools in the gray caption bar (same row as the title and the "v" menu button). |
| `addCategory` | node/figureFiles.mjs:111 | The folder, an empty manifest, the line in directoryRegistry.json (kept sorted) and the help folder that mirrors it. |
| `addDrawSubtab` | ui/draw/drawNav.js:98 | opens an object in its own subtab (or switches to it if already open) and draws it. |
| `addFreePoint` | ui/figures/figurePoints.js:267 | transform: the active layer's transform, so the free disc's position can be stored in that layer's object space (ox, oy) and travel with the layer from then on. |
| `addHandlePoint` | ui/figures/figurePoints.js:287 | A disc that rides on handle number h of the layer's object (see "h" in the header). |
| `addPatternSubtab` | ui/patterns/patternsNav.js:101 | adds (or relabels) the subtab for the pattern being shown. |
| `adjustStartEnd` | draw/drawEllipse.js:108 | where the stitching starts and ends on the ring of nodes, after the start skip and end skip settings; returns the new start, end and length. |
| `allPairs` | draw/connectors.js:129 | every point joined to every other, each pair once. |
| `alongCorners` | draw/curves.js:141 | n points spread evenly by distance round the closed outline through the corners given, starting at the first corner. |
| `appendErrorLog` | node/logAndEditorRequests.mjs:247 | TASK: appendErrorLog DESCRIPTION Appends errors reported by the app (ui/errorReport.js) to today's |
| `appendManifestEntry` | node/writerRequests.mjs:47 | Adds one entry to the end of a manifest (a JSON array). |
| `applyEditManifest` | ui/editManifestDialog.js:290 | sends the edited fields to the service, which writes them to the manifest, then runs the complete rebuild. |
| `applyFollowerMove` | ui/figures/figureWeldMove.js:155 | Moves one follower disc's layer by the canvas delta, choosing handle-move, arm-translate, or whole-layer-translate as described in the header. |
| `applyTheme` | ui/setUI.js:64 | sets the page's colour theme for the tab. |
| `applyTransform` | draw/drawTransform.js:77 | Object space to canvas space: turn about the object-space origin (0, 0) by t.angle, then shift by (t.tx, t.ty). |
| `applyValue` | ui/controls/widgets/rangeWidget.js:115 | sets the slider, its readout and the parameter to a new value (kept in range), then redraws. |
| `applyValue` | ui/controls/widgets/rangeWidget.js:239 | sets the slider, its readout and the parameter to a new value (kept in range), then redraws. |
| `arcCurvature` | draw/drawEllipse.js:288 | Lets me specify using a real looking number |
| `archiveActiveSecondaryObject` | ui/draw/drawMenuCmds.js:452 | moves the open saved-settings object to its archive folder, after asking. |
| `archiveFigureTab` | ui/figures/figuresSave.js:342 | Moves the saved file to figures/<category>/archive/ and drops its manifest entry (the same service call the other tabs use). |
| `archiveGalleryItem` | ui/gallery/galleryMenuCmds.js:218 | moves the item shown to its archive folder, after asking. |
| `archiveItem` | node/manifestRequests.mjs:452 | TASK: archiveItem  (GENERIC) Payload: { |
| `archiveItem` | ui/archiveItem.js:28 | Canonical call: await archiveItem({ payload: { manifestPath, filename }, |
| `archivePatternsItem` | ui/patterns/patternsMenuCmds.js:135 | moves the pattern shown to its archive folder, after asking, and shows the next one. |
| `archiveSecondary` | ui/draw/secondaryObjects.js:38 | Moves a secondary object to the archive folder. |
| `archiveSecondaryObject` | node/secondaryRequests.mjs:128 | TASK: archiveSecondaryObject |
| `archiveUtilitiesItem` | ui/utilities/utilitiesMenuCmds.js:134 | moves the utility shown to its archive folder, after asking. |
| `arcPoints` | draw/drawEllipse.js:232 | PURPOSE: - Replaces the complex, multi-function legacy arc logic. |
| `arcPoints` | draw/shapers.js:67 | n+1 points along a circular arc about centre c, radius r, from fromDeg to toDeg (degrees, clockwise on the canvas because y points down). |
| `armInteractor` | ui/interactor.js:22 | DRAW SIDE: Coordination Logic |
| `armPoint` | ui/figures/figurePoints.js:134 | The point at fraction t along an arm, in canvas space. |
| `armsOf` | ui/figures/figurePoints.js:117 | Exported for figureWelds.js (Phase 8), which has to look across an object's own other arms -- a Parabola's two corner handles, say -- when a weld is made at ... |
| `assertDirectoryExists` | node/serviceFileHelpers.mjs:71 | Fail-fast directory existence check. |
| `assertFileExists` | node/serviceFileHelpers.mjs:82 | Fail-fast file existence check. |
| `assertFileName` | node/figureFiles.mjs:36 | refuses a name that cannot be a file name on Windows (< > : " \| ? *, or a leading or trailing dot or space). |
| `assertSimpleName` | node/safePaths.mjs:53 | The value must be a non-empty string that is a single path segment: no "/" or "\", no NUL character, and not "." or "..". |
| `astroidPoints` | draw/curves.js:88 | the four-cusped hypocycloid, x = cos^3 t, y = sin^3 t. |
| `attachCanvasToRegion` | ui/scriptRunner.js:192 | moves the shared canvas into a region of the page. |
| `autoFitParametricToCanvas` | draw/drawParametrics.js:137 | Measures the raw mathematical bounds of the curve and updates the 'scale' and 'mid' properties of the Parametric object to fit the canvas. |
| `background` | draw/background.js:5 | fills the shared canvas with a colour and, if grid is true, draws a light grid over it. |
| `beginStepPass` | ui/draw/drawStep.js:83 | a redraw is starting; count from zero again. |
| `bodyOf` | node/makeHelpPdf.mjs:41 | the inside of a page's body element. |
| `bothUnits` | ui/figures/figurePrint.js:258 | A length in mm as words in both units, for the cover sheet ("4.8 mm (0.188 in)"). |
| `boxOfFigure` | ui/figures/figureTemplates.js:169 | The smallest rectangle round every visible layer that is not a guide, in canvas pixels, or null when nothing has been drawn yet. |
| `breakApartLayer` | ui/figures/figureBreakApart.js:44 | Replaces the active layer's object with its pieces (Phase 7c). |
| `buildAllToAllPairs` | draw/drawLinkedCircles.js:46 | every pair of circle numbers once, for the all-to-all link style. |
| `buildCanvasThumbnailBase64` | ui/thumbnails.js:67 | Crops excess whitespace and scales the result to fit within w x h while MAINTAINING ASPECT RATIO. |
| `buildCategoryDescriptor` | ui/categories.js:224 | Helper function to build a category descriptor array from a grouped data structure. |
| `buildCategoryFrame` | ui/categories.js:394 | Utility: create outer #categories wrapper manually. |
| `buildCategoryFrameElement` | ui/categories.js:282 | <div class="category-frame">   <div class="category-header">title</div>   <div class="category-content"></div> |
| `buildCategoryItemElement` | ui/categories.js:314 | <div class="item">   <span>name</span>   [chevron icon if hasSubitems] |
| `buildCirclePairs` | draw/drawLinkedCircles.js:60 | which circles are linked, by link style: pairwise (each to the next), ring (pairwise and the last back to the first) or all to all. |
| `buildControls` | ui/draw/drawStep.js:128 | the stepping controls, appended to #button. |
| `buildControlsIfPresent` | ui/scriptRunner.js:241 | Builds parameter controls ONLY if scriptInfo exists AND caller requests controls. |
| `buildCurveFromParams` | drawRegistry/parametrics.js:137 | the settings the parametric drawing code needs, gathered from the object's params (centre, zoom, colour, line width, intersections ...). |
| `buildDrawMenuItems` | ui/draw/drawMenuCmds.js:202 | Legacy descriptor format used by older callers. |
| `buildDrawParameterData` | ui/controls/builders/dataBuilder.js:9 | Defensive guard: If the Draw tab is not initialized or no registry is active, there are no parameters to expose. |
| `buildEditManifestHtml` | ui/editManifestDialog.js:96 | buildEditManifestHtml - TABLE LAYOUT (REFINED) |
| `buildFigureScript` | node/createFigureService.mjs:167 | Generates the ES module source for a figure file. |
| `buildFullHelpHtmlDocument` | ui/helpEditor.js:29 | Builds a complete HTML document for saving. |
| `buildGalleryOffcanvasHtml` | ui/gallery/galleryMenuCmds.js:313 | the buttons of the Gallery Maintenance panel. |
| `buildGallerySubtabs` | ui/gallery/galleryNav.js:62 | the Gallery subtab bar: Ideabook, Patterns, Scripts. |
| `buildHelpItem` | ui/help.js:171 | PURPOSE Build a Help menu item ("Help" or "Create Help") using a recursive manifest tree. |
| `buildHelpJsTreeData` | ui/helpTree.js:82 | Converts the hierarchical help manifest into jsTree data. |
| `buildHomeAdapter` | ui/home/homeNav.js:62 | the description of Home's subtabs (id, label, what a click does) for the shared subtab builder. |
| `buildHomeCategoryDescriptor` | ui/home/homeNav.js:241 | the frames for the categories view: one per status, A to Z, each item with its picture or name and what a click opens. |
| `buildHomeListFromReport` | node/maintain_manifests.mjs:302 | Aggregates all entries with a 'status' from local manifests into a single Home list. |
| `buildHomeOffcanvasHtml` | ui/home/homeMenuCmds.js:186 | the buttons of the Home Maintenance panel. |
| `buildParameterControls` | ui/controls/controlsCore.js:59 | UNIVERSAL ENTRY POINT (ROUTER) This function determines which environment is active (Draw tab, Scripts tab, etc.) and delegates to the |
| `buildPatternsOffcanvasHtml` | ui/patterns/patternsMenuCmds.js:262 | the buttons of the Patterns Maintenance panel. |
| `buildScriptParameterData` | ui/controls/builders/dataBuilder.js:93 | SCRIPTS TAB DATA BUILDER ENVIRONMENT: Scripts / Tools tab only. |
| `buildSingleControl` | ui/controls/rendering/renderer.js:162 | - Add a new case: "radio" |
| `buildSubtabBar` | ui/resultsViewController.js:64 | Builds the subtab bar inside #subtabs from the adapter's tab definitions. |
| `buildSubtabButton` | ui/gallery/galleryNav.js:107 | one subtab button. |
| `buildSubtabButton` | ui/resultsViewController.js:127 | Creates a single <li><button> subtab element. |
| `buildUtilitiesAdapter` | ui/utilities/utilitiesNav.js:43 | the description of the Utilities subtabs (Tools, Lab, Result) for the shared subtab builder. |
| `buildUtilitiesOffcanvasHtml` | ui/utilities/utilities.js:261 | the buttons of the Utilities Maintenance panel. |
| `buildWrappedArm` | draw/drawRegular.js:208 | steps+1 nodes of the ring from startIndex, wrapping past the last node to the first. |
| `button` | ui/scriptHistory.js:222 | a button with text that runs onClick. |
| `calculateTintAndShade` | draw/color.js:3 | a lighter (tint) and a darker (shade) version of a colour, percentage of the way to white and to black. |
| `canBreakApart` | ui/figures/figureBreakApart.js:23 | True when the active layer is visible and its object can come apart (its registry entry has a decompose()). |
| `cardioidPoints` | draw/curves.js:95 | the heart, r = (1 + cos t) / 2: the epicycloid with one cusp, which sits at the centre c, the curve reaching r to the right. |
| `categoriesOf` | node/libraryIndex.mjs:70 | the category folders of a library, in order. |
| `centroidHit` | ui/figures/figureCentroid.js:142 | True when canvas point (x, y) is on the diamond, or on the rotation handle while the diamond is selected. |
| `changeLine` | draw/drawRegular.js:136 | an arm with points removed: truncate drops points from the start, shorten from the end, always leaving at least two. |
| `checkClock` | draw/drawState.js:180 | throws if the drawing has run past its deadline. |
| `checkDrawRegistry` | ui/registryCheck.js:98 | every problem in the whole draw registry, each naming its object. |
| `checkDrawsThroughDrawLine` | ui/registryCheck.js:119 | The rule: registry objects reach the canvas only through drawLine (draw/drawUtilities.js). |
| `checkFigureFormat` | ui/figures/figureModel.js:196 | every problem found in a figure's data, as sentences (empty when sound); used when a figure file is opened. |
| `checkManifestEntries` | node/maintain_manifests.mjs:215 | Looks for manifest entries that point at nothing, and categories that are listed but not there. |
| `checkRegistryEntry` | ui/registryCheck.js:40 | every problem with one registry object (missing name, params, init, update or draw ...), as sentences. |
| `chords` | draw/connectors.js:87 | within one array, point i joined to point i+skip. |
| `circlePoints` | draw/drawLinkedCircles.js:35 | The numPoints points evenly spaced around one circle, in the same order and starting angle drawLinkedCircles() stitches from. |
| `clamp01` | draw/background.js:110 | v kept between 0 and 1. |
| `clampValue` | ui/controls/widgets/rangeWidget.js:106 | v kept within the slider's range. |
| `clampValue` | ui/controls/widgets/rangeWidget.js:230 | v kept within the slider's range. |
| `clear` | ui/menuManager.js:152 | closes any open menu. |
| `clearCanvas` | ui/draw/drawRunner.js:138 | wipes the shared canvas. |
| `clearCanvasBackground` | ui/scriptRunner.js:214 | fills the canvas with one colour (white unless given). |
| `clearCategoryFrame` | ui/categories.js:379 | Utility: clear a category region entirely. |
| `clearDivs` | ui/uiUtilities.js:21 | Empties the core divs shared by all tabs. |
| `clearDrawCaption` | ui/draw/drawMenuCmds.js:177 | empties the caption bar. |
| `clearGalleryCaption` | ui/gallery/galleryNav.js:190 | empties the caption bar. |
| `clearHomeCaption` | ui/home/homeMenuCmds.js:47 | empties the caption bar. |
| `clearHomeLocalState` | ui/home/home.js:165 | forgets Home's working values (the grouped list and the render count). |
| `clearLaunch` | ui/draw/draw.js:265 | empties the launch request. |
| `clearPatternsCaption` | ui/patterns/patternsNav.js:200 | empties the caption bar. |
| `clearTimings` | ui/instrument.js:70 | forgets every timing taken. |
| `clonePoints` | classes/linkedCircles.js:147 | Creates a deep-ish clone of an array of Points. |
| `clonePoints` | classes/overlayClass.js:156 | Creates a deep-ish clone of an array of Points. |
| `close` | ui/menuManager.js:77 | removes the open menu and stops listening for clicks outside it. |
| `closeFormsOverlay` | ui/editManifestDialog.js:374 | closes the dialog overlay. |
| `closeNotesOverlay` | ui/overlay.js:266 | Tears the notes popup down exactly as its close (x) button does. |
| `closeOverlay` | ui/overlay.js:120 | hides the help overlay. |
| `closeTab` | ui/figures/figuresNav.js:486 | Throws the figure away (after asking, if it has unsaved changes), stops every mouse listener that may belong to it, and shows another subtab. |
| `collectRegistryEntries` | ui/draw/drawCategories.js:48 | every registry object that is not a template, as { key, name, category, entry }. |
| `colourNameToHex` | draw/color.js:75 | a CSS colour name ("aliceblue") as its hex code, or false if the name is not known. |
| `comparePoints` | draw/drawUtilities.js:731 | true when two points are the same to two decimal places. |
| `computeHelpPathFromParts` | ui/helpTree.js:223 | Builds the canonical help file path for a leaf. |
| `consumeLaunchIfForDraw` | ui/draw/draw.js:243 | the waiting launch request (from Home or Figures) if it is for the Draw tab, cleared once read; null otherwise. |
| `consumeLaunchIfForFigures` | ui/figures/figures.js:196 | If Home launched this tab for a saved figure, clears the launch request and opens the figure. |
| `convertParabPtsToLines` | draw/drawUtilities.js:90 | each parabola given as 3 or 4 points turned into its two lines (a 3-point corner has its middle point doubled). |
| `copyActiveDrawObject` | ui/draw/drawMenuCmds.js:265 | opens a copy of the open object in a new subtab, with the same settings (Copy Object). |
| `copyBuildDocs` | node/copyBuildDocs.mjs:151 | empty help/BuildDocs and fill it again from docs/. |
| `copyFigureTab` | ui/figures/figuresSave.js:269 | Opens a copy of the figure in a new subtab. |
| `corner` | draw/connectors.js:78 | the curve stitch most used in the ideabook. |
| `cornerPartners` | ui/figures/figureWelds.js:94 | A Parabola's two corner handles (line1_pt2 and line2_pt1, say) are two separate fields, independent by default (Phase 7's "fan/bowtie" finding): they only st... |
| `countStatusItems` | node/maintain_manifests.mjs:419 | Counts entries in an array that have a defined status property. |
| `createArms` | draw/drawRegular.js:66 | the points along each line (the arms that get stitched), each trimmed by the truncate and shorten settings. |
| `createEmptyFigure` | ui/figures/figureModel.js:81 | A new, empty figure. |
| `createFigure` | node/createFigureService.mjs:33 | writes a new figure file from a figure name, a category (made if new) and its objects. |
| `createGalleryPatternPng` | ui/draw/drawExport.js:52 | UI worker for "Create PNG" (Draw tab). |
| `createLinesFromNodesMiddle` | draw/drawRegular.js:77 | a line from the middle to each node: the spokes of a star. |
| `createLinesFromNodesOuter` | draw/drawRegular.js:86 | a line from each node to the next, round the ring: the sides of a polygon. |
| `createMenuItem` | ui/menuManager.js:58 | one menu item. |
| `createNewCategory` | node/createFigureService.mjs:121 | Branch B — executed before Branch A when isNewCategory is true. |
| `createNodes` | draw/createNodes.js:23 | the points (nodes) round an object's ellipse or circle, from its settings: how many, rotation, x and y scale, spacing bias and jitter. |
| `createOrJoinWeld` | ui/figures/figureWeldModel.js:60 | Joins the two points into one weld group, merging their groups if each already had one. |
| `createParab` | draw/drawRegular.js:96 | two arms stitched point for point (stitcher), the shorter arm first. |
| `createParabs` | draw/drawRegular.js:112 | Creates an array of parabolas by stitching together corresponding arms from two arrays. |
| `createPatternFromActiveDrawObject` | ui/draw/drawMenuCmds.js:231 | writes the open Draw object, with its present settings, as a pattern script (Save as Pattern). |
| `createPatternScript` | ui/draw/drawExport.js:117 | UI worker for Draw command "Create Pattern". |
| `createPatternScriptTextFromDrawRegistry` | ui/draw/drawExport.js:211 | Produces a Patterns-style script file: export function runPattern() { const s = {...} |
| `createPatternThumbnail` | ui/patterns/patternsMenuCmds.js:101 | saves the canvas as the pattern's thumbnail picture. |
| `createPngFromActiveDrawObject` | ui/draw/drawMenuCmds.js:349 | saves the canvas as a PNG in the Gallery (Save as PNG). |
| `createPrintNodes` | draw/drawUtilities.js:67 | CREATE PRINT NODES |
| `crossHair` | draw/drawUnicorns.js:9 | a grey cross 40 pixels wide over each point, to mark it. |
| `crossingOf` | draw/intersections.js:55 | where segment p1-p2 crosses segment p3-p4, as { x, y, ua, ub } (ua and ub: how far along each, 0 to 1), or null. |
| `crossings` | ui/figures/figureMagic.js:107 | Every crossing of one arm of the layer with the arms of every visible layer, named by the other arm and counted along this arm. |
| `curveFeatures` | ui/figures/figureMagic.js:71 | Tips and cusps of one list arm, in order along it. |
| `deactivateCentroid` | ui/figures/figureCentroid.js:365 | Removes all four listeners with one abort. |
| `deactivatePointsInput` | ui/figures/figurePointer.js:340 | Removes every points-mode listener (one abort) and hides the interaction layer. |
| `decodeEntities` | node/homeListRequests.mjs:74 | the few HTML entities a title is likely to hold. |
| `deflectPoint` | draw/drawUtilities.js:601 | the point distance away from origin in the direction angle (radians). |
| `deleteLayer` | ui/figures/figureLayers.js:356 | Deletes the active layer. |
| `deletePoint` | ui/figures/figurePoints.js:345 | Removes the point. |
| `deleteTab` | ui/draw/drawNav.js:176 | closes an object's subtab and shows its neighbour. |
| `deriveHomeOriginFromPath` | ui/home/homeResults.js:188 | which tab an item belongs to, from its path (Patterns, Gallery, Utilities, Figures). |
| `destroyHelpJsTree` | ui/helpTree.js:47 | Destroys any existing jsTree instance and unhooks events. |
| `disableAllNextPrevOverlays` | ui/nextPrevOverlay.js:149 | Exists for API symmetry and future expansion. |
| `disableNextPrevOverlay` | ui/nextPrevOverlay.js:132 | hides the Prev and Next overlay and forgets its handlers. |
| `disarmInteractor` | ui/interactor.js:96 | 1. |
| `discOnHandle` | ui/figures/figureWelds.js:210 | A disc on handle h of the layer, found or made. |
| `dispatchService` | node/sketchpadService.mjs:148 | runs the request named, with its payload, through the table above. |
| `displayPoint` | draw/drawUtilities.js:128 | Draws a circle on the canvas with a default radius of 2 and a default color of yellow. |
| `displayUtilityResult` | ui/utilities/utilitiesDisplay.js:189 | shows a utility's result (HTML) in #text. |
| `distanceToLine` | draw/shapers.js:206 | how far p is from the line through a and b (from a itself if a and b are the same point). |
| `drawActiveTab` | ui/draw/drawRunner.js:31 | Core execution logic for the active Draw object. |
| `drawALine` | draw/drawUtilities.js:381 | Defensive check: ensure line has valid structure |
| `drawAParab` | draw/drawRegular.js:129 | stitches the corner made by two lines (line1 start to end, then line2) and draws it. |
| `drawCentroid` | ui/figures/figureCentroid.js:159 | Clears the overlay and draws the diamond (and, when selected, the box, stem and rotation handle) of the active layer. |
| `drawCircle` | draw/drawUtilities.js:145 | a stroked circle (not filled), mapped through the layer transform in Figures. |
| `drawCircularParabola` | draw/drawRegular.js:185 | Circular Parabola: arms taken round the ring of nodes, each stitched to the next. |
| `drawCycloid` | draw/drawUnicorns.js:25 | Cycloid: the ring of nodes joined by the times-table rule, numCycloids loops. |
| `drawEnd` | draw/drawEllipse.js:70 | Draws the taper-down phase at the end of the pattern. |
| `drawEulerSpiral` | draw/drawSpirals.js:25 | Example usage: const myCanvas = document.getElementById("myCanvas"); |
| `drawFermatSpiral` | draw/drawSpirals.js:56 | a Fermat spiral (radius grows with the square root of the angle), from scale, turns and gap. |
| `drawFigurePoints` | ui/figures/figurePoints.js:440 | Draws every disc on the main canvas: a filled circle in the color of its layer with a black rim, no number. |
| `drawInCircle` | draw/drawEllipse.js:179 | In Circle, which is In Ellipse with both axes set from the radius. |
| `drawInEllipse` | draw/drawEllipse.js:188 | makes the ring of nodes for the object and stitches them (renderPattern). |
| `drawInnerStar` | draw/drawRegular.js:242 | a star of stitched corners between neighbouring spokes (lines from the middle to each node). |
| `drawInverseStar` | draw/drawRegular.js:256 | Inverse Star: each spoke stitched to a side of the polygon, so the curves bow outward. |
| `drawLine` | draw/drawUtilities.js:393 | the one way registry objects draw a line (see the header above for the cases it accepts, Final mode, the layer transform and stepping). |
| `drawLines` | draw/drawUtilities.js:241 | draws each Line of a list; with close, also joins the last line's end to the first line's start. |
| `drawLinesAround` | draw/drawUtilities.js:293 | PURPOSE - Draw a sequence of straight-line segments between points in ptArray, where each point i is connected to point (i + skip). |
| `drawLinesWithin` | draw/drawUtilities.js:342 | PURPOSE - Draw many straight line segments between points in an array. |
| `drawLinkedCircles` | draw/drawLinkedCircles.js:80 | Fail-fast validation The function expects a fully-formed LinkedCircles object. |
| `drawLogarithmicSpiral` | draw/drawSpirals.js:104 |  drawLogarithmicSpiral    r is the radius from the origin. |
| `drawMagicMarks` | ui/figures/figureMagic.js:191 | In points mode, a small open diamond on every magic point of the active layer, so it is visible where a click will land on one. |
| `drawManyLines` | draw/drawUtilities.js:206 | PURPOSE Draw a set of straight-line connections between points in an array, using a configurable skip pattern. |
| `drawManyParabs` | draw/drawRegular.js:124 | draws each stitched parabola of a list. |
| `drawManyParabs` | draw/drawUtilities.js:103 | draws each parabola of a list (3-point corners have their middle point doubled first). |
| `drawMysticRose` | draw/drawUnicorns.js:52 | Mystic Rose: every node joined to every other node. |
| `drawNodes` | draw/drawUtilities.js:157 | joins the nodes in order round the ring, the last back to the first: the outline of the shape. |
| `drawOneCircle` | draw/drawLinkedCircles.js:20 | Circles use ctx.arc, so they have no endpoints. |
| `drawPairs` | draw/drawUtilities.js:768 | draw the lines a connector returned (draw/connectors.js). |
| `drawParab` | draw/drawRegular.js:167 | PURPOSE - Build two arms from two lines and stitch them into a parabola. |
| `drawParabs` | draw/drawUtilities.js:113 | draws the stitch lines of each parabola, leaving out the last thing.truncate lines. |
| `drawParametric` | draw/drawParametrics.js:55 | The primary loop for evaluating, auto-fitting, and drawing the curve segments. |
| `drawPlusMark` | ui/figures/figureWeldMarks.js:61 | a weld mark: a white disc with a plus in the given colour. |
| `drawPolar` | draw/drawParametrics.js:34 | Converts polar function definitions into Cartesian parametric functions and then hands them off to the main drawing engine. |
| `drawPureSpiral` | draw/drawSpirals.js:136 | an Archimedean spiral drawn as a smooth line: radius grows by spread for every radian, up to maxAngle. |
| `drawPureSpiralA` | draw/drawSpirals.js:166 | an Archimedean spiral drawn as short straight steps, 60 to a turn, gap apart, for numRotations turns. |
| `drawPureSpiralB` | draw/drawSpirals.js:193 | points along a spiral, 10 degrees apart, drawn as dots (ptsToDraw of them). |
| `drawRabbitPursuitCurve` | draw/drawPursuit.js:9 | the fox-and-rabbit pursuit curve: the fox always runs towards where the rabbit is now, and its path is drawn step by step. |
| `drawRadiate` | draw/drawUnicorns.js:65 | Radiate: lines from one point (radialPt) to evenly spaced points along a line. |
| `drawRegularPolygon` | draw/drawRegular.js:340 | a regular polygon with a stitched corner between each pair of neighbouring sides. |
| `drawRegularPolygonCorner` | draw/drawRegular.js:358 | From each node, draw a curve-stitch parabola. |
| `drawRegularPolygonTouch` | draw/drawRegular.js:382 | a regular polygon whose stitched curves touch across the middle (an even number of sides is used). |
| `drawSpacingMarks` | ui/figures/figurePrint.js:179 | With tabState.showSpacing on: a red ring round both nails of each pair that is too close, joined by a red line. |
| `drawSpeckledRadialGradient` | draw/background.js:70 | PURPOSE Draw a “speckle field” whose density is LOW near the center and HIGH near the edges. |
| `drawSpiral` | draw/drawSpirals.js:217 | lines between points stepping round a set of containers (rings) at the given intervals: the general spiral routine used by spiral scripts. |
| `drawStart` | draw/drawEllipse.js:32 | Internal Pattern Helpers (Original Logic & Comments) |
| `drawTheodorusSpiral` | draw/drawSpirals.js:270 | FUNCTION TO DRAW A SINGLE TRIANGLE SEGMENT |
| `drawThumb` | ui/thumbnailSettings.js:125 | where a Draw object's thumbnail picture is. |
| `drawTriangle` | draw/drawSpirals.js:274 | FUNCTION TO DRAW A SINGLE TRIANGLE SEGMENT |
| `drawWeldMarks` | ui/figures/figureWeldMarks.js:36 | One mark per weld group, at any one member's position (all of a satisfied group's members coincide): a black plus on a white halo, or red while the group's m... |
| `drawWithin` | draw/drawEllipse.js:52 | length = how many nodes to cover starting at `start` (not an index). |
| `edgeWeight` | draw/background.js:118 | Probability and alpha both ramp UP toward edges. |
| `editGalleryManifestItem` | ui/gallery/galleryMenuCmds.js:187 | opens Edit Manifest for the item shown (title, status). |
| `editHomeManifestItem` | ui/home/homeMenuCmds.js:156 | opens Edit Manifest for the item shown (title, status). |
| `editManifestEntry` | node/manifestRequests.mjs:40 | Payload: { manifestPath : "/home/manifest.json" \| "/patterns/.../manifest.json" \| "/gallery/.../manifest.json" \| "/utilities/.../manifest.json", |
| `editManifestEntryInSingleFile` | node/manifestRequests.mjs:192 | Updates exactly one manifest file in place (array of entries). |
| `editPatternsManifestItem` | ui/patterns/patternsMenuCmds.js:207 | opens Edit Manifest for the pattern shown (title, status). |
| `editUtilitiesManifestItem` | ui/utilities/utilitiesMenuCmds.js:102 | opens Edit Manifest for the utility shown (title, status). |
| `ellipsePoints` | draw/curves.js:132 | an ellipse of half-width r and half-height r * ratio. |
| `enableNextPrevOverlay` | ui/nextPrevOverlay.js:101 | Args: spec = { targetEl: <HTMLElement>, |
| `endStepPass` | ui/draw/drawStep.js:92 | a redraw has finished; bring the slider and the readout up to date (the number of lines can change when a setting changes). |
| `ensureArray` | ui/menuManager.js:31 | value if it is an array; throws otherwise. |
| `ensureGalleryCacheLoaded` | ui/gallery/gallery.js:97 | reads the lists of the three Gallery areas (Ideabook, Patterns, Scripts). |
| `ensureHomeSavedState` | ui/home/home.js:79 | makes sure Home's remembered state exists, starting on Categories. |
| `ensureOverlayElement` | ui/nextPrevOverlay.js:36 | finds the Prev and Next overlay in the page, once. |
| `ensurePatternDummyThumb` | node/maintain_manifests.mjs:384 | Ensures a thumbnail image exists for a pattern by copying a dummy file. |
| `ensurePatternsManifestLoaded` | ui/patterns/patterns.js:83 | reads the Patterns lists. |
| `ensureReady` | ui/menuManager.js:24 | throws if the menu manager has not been started. |
| `ensureResultsSubtab` | ui/gallery/galleryNav.js:129 | adds the Results subtab (the item being viewed) if it is not there. |
| `ensureUtilitiesCacheLoaded` | ui/utilities/utilities.js:67 | reads the Tools and Lab lists. |
| `epicycloidPoints` | draw/curves.js:69 | the path of a point on a small circle rolling round the outside of a big one; lobes is how many cusps. |
| `errorStates` | ui/errorChecklist.js:48 | go through every log line in order and work out, for each different error, whether it is open or ticked. |
| `escapeAttr` | ui/editManifestDialog.js:388 | text made safe for an HTML attribute. |
| `escapeHtml` | node/copyBuildDocs.mjs:36 | text made safe to put inside HTML. |
| `escapeHtml` | ui/htmlText.js:7 | htmlText.js Text helpers for building HTML strings. |
| `everyNth` | draw/shapers.js:93 | every nth point, beginning at index `start`. |
| `executeScriptToCanvas` | ui/scriptRunner.js:286 | Execute a module into the shared canvas. |
| `executeScriptToText` | ui/scriptRunner.js:362 | Executes a script module and displays its output as text in the DOM. |
| `expandSchema` | ui/controls/builders/conventions.js:61 | a new schema object (the one given is not changed). |
| `extendWithArms` | draw/drawEllipse.js:90 | Helper: optionally extend ellipse with attached arms If arm1 shares first circle point, remove overlap before concat |
| `extractBodyInnerHtml` | ui/helpTree.js:25 | Returns the HTML found BETWEEN <body> ... |
| `extractHeaderNotes` | ui/notes.js:20 | the header comment at the top of a file's text, for the Notes popup. |
| `fetchJson` | ui/thumbnailMaker.js:123 | a JSON file's contents, or null if it cannot be read. |
| `figureThumb` | ui/thumbnailSettings.js:120 | where a figure's thumbnail picture is. |
| `fillPanel` | ui/scriptHistory.js:81 | reads the script's saved versions from VS Code's history and lists them, each with Run and Compare. |
| `filterControlsByActiveGroups` | ui/controls/builders/groupFilter.js:38 | Get the schema (controls definitions) |
| `findCandidate` | ui/figures/figurePoints.js:170 | The infrastructure point nearest to (x, y) within radius, or null. |
| `findFeature` | ui/figures/figureMagic.js:179 | Where the named feature is now on that arm, as t, or null if the object no longer has it (the other layer moved away, say). |
| `findHandleIndex` | ui/figures/figureWeldMove.js:100 | Matching by position (to a millionth of a pixel) rather than by name works for every object without a table of field names: an arm's a and b are the object's... |
| `findHistory` | node/scriptHistoryRequests.mjs:71 | The history folder and entries for one file, or null when VS Code has none. |
| `findIntersections` | draw/intersections.js:70 | see the header. |
| `findMissingThumbnails` | ui/thumbnailMaker.js:176 | Asks for each picture file. |
| `findOriginalManifestEntryByRootedPath` | node/manifestRequests.mjs:274 | Searches ALL real manifests under: ./patterns, ./gallery, ./utilities For each entry, computes its rooted path using the same |
| `findPoint` | ui/figures/figurePoints.js:220 | The numbered point of the active layer nearest to (x, y) within radius, or null. |
| `formatRebuildReportShared` | ui/rebuildSync.js:59 | a rebuild's report as text for the panel: problems first, then what was added. |
| `formatTimings` | ui/instrument.js:82 | The slowest entries first, then every entry in the order it started. |
| `fromUnits` | ui/figures/figurePrint.js:253 | A length typed in the print units, as mm. |
| `galleryThumb` | ui/thumbnailSettings.js:115 | where a gallery item's thumbnail picture is. |
| `geometry` | ui/figures/figureCentroid.js:100 | Where everything is, in canvas pixels, or null when the active layer has no centroid right now (none, hidden, nothing drawn, Show All). |
| `getCanvasCoords` | ui/interactor.js:144 | where a mouse event is, in canvas pixels (allowing for the canvas being shown larger or smaller). |
| `getCurrentCategory` | ui/gallery/galleryState.js:48 | the category shown. |
| `getCurrentCategory` | ui/patterns/patternsState.js:33 | Getters |
| `getCurrentCategory` | ui/utilities/utilitiesState.js:40 | the Utilities category shown. |
| `getCurrentDomain` | ui/gallery/galleryState.js:46 | the Gallery area shown (Ideabook, Patterns or Scripts). |
| `getCurrentDomain` | ui/utilities/utilitiesState.js:38 | Getters |
| `getCurrentIndex` | ui/gallery/galleryState.js:51 | Setters |
| `getCurrentIndex` | ui/patterns/patternsState.js:38 | the position of the pattern shown in its category. |
| `getCurrentIndex` | ui/utilities/utilitiesState.js:44 | the position in that list. |
| `getCurrentList` | ui/gallery/galleryState.js:50 | the list being stepped through with Prev and Next. |
| `getCurrentList` | ui/utilities/utilitiesState.js:42 | the list being stepped through. |
| `getCurrentTabId` | ui/figures/figuresState.js:58 | the figure subtab now shown. |
| `getDrawCaptionMenuItems` | ui/draw/drawMenuCmds.js:98 | Always present: Help, Save as PNG, Save as Pattern, Copy Object, Reset Parameters |
| `getFiguresCaptionMenuItems` | ui/figures/figuresCommands.js:158 | Returns the menu as an array of items. |
| `getFiguresRegistry` | ui/figures/figuresState.js:53 | Getters |
| `getGalleryCache` | ui/gallery/gallery.js:111 | the three Gallery areas' lists, each as { category: [entries] }. |
| `getGalleryCache` | ui/gallery/galleryState.js:44 | Getters |
| `getGalleryCaptionMenuItems` | ui/gallery/galleryMenuCmds.js:148 | the caption menu for a Gallery item (Help, Show Script, Edit Manifest, Archive ...). |
| `getHasRunUtility` | ui/utilities/utilitiesState.js:45 | Setters |
| `getHomeCaptionMenuItems` | ui/home/homeMenuCmds.js:138 | the caption menu for an item opened from Home (Help, Show Script, Edit Manifest ...). |
| `getHomeManifestGrouped` | ui/home/homeState.js:30 | Getters |
| `getHomeResultsRenderToken` | ui/home/homeState.js:31 | Setters |
| `getIdsWithSecondaries` | ui/draw/drawTabState.js:35 | Getter |
| `getIDsWithSecondaries` | ui/draw/secondaryObjects.js:69 | Returns an array of primary IDs that possess at least one secondary object. |
| `getLineEquation` | draw/drawUtilities.js:741 | the equation of the line through two points, as text ("y = mx + b", or "x = c" when vertical). |
| `getMidpointSet` | classes/linkedCircles.js:118 | Returns the predefined midpoint array for a given circle count. |
| `getMidpointSet` | classes/overlayClass.js:127 | Returns the predefined midpoint array for a given circle count. |
| `getPatternsCaptionMenuItems` | ui/patterns/patternsMenuCmds.js:243 | the caption menu for a pattern (Help, Show Script, Script history, Edit Manifest, Archive ...). |
| `getPreviousIndex` | draw/drawUtilities.js:647 | the index before i in a ring of length items (0 wraps to the last). |
| `getPrimaryObjectsWithSecondaries` | node/secondaryRequests.mjs:190 | TASK: getPrimaryObjectsWithSecondaries |
| `getSecondaryManifest` | node/secondaryRequests.mjs:163 | TASK: getSecondaryManifest |
| `getTinyMceConfig` | ui/helpEditor.js:62 | Returns a TinyMCE init config object. |
| `getUtilitiesCache` | ui/utilities/utilities.js:77 | the Tools and Lab lists, each as { category: [entries] }. |
| `getUtilitiesCaptionMenuItems` | ui/utilities/utilitiesMenuCmds.js:83 | the caption menu for a utility (Help, Show Script, Edit Manifest, Archive ...). |
| `groupBySpot` | ui/figures/figurePrint.js:72 | Puts each point into the first group whose first point is within SAME_SPOT_PX of it, or starts a new group. |
| `groupEntriesByCategory` | ui/draw/drawCategories.js:64 | the entries grouped by category, categories and entries in alphabetical order. |
| `groupHomeEntriesByStatus` | ui/home/homeManifest.js:98 | the Home list grouped by status ({ Queue: [...], fix: [...] }). |
| `growingChords` | draw/connectors.js:103 | round a loop, point i joined to point i + skip0 + i*grow. |
| `handleDispatch` | node/sketchpadServer.mjs:200 | DESCRIPTION Reads JSON request body, calls dispatchService(), and returns the result as JSON. |
| `handleNameOf` | ui/figures/figurePoints.js:304 | The name of handle number h, from the object's handleNames (a list, or a prefix such as "circle" for circle1, circle2 ...). |
| `handleRequest` | node/sketchpadServer.mjs:162 | DESCRIPTION Main HTTP router. |
| `handleTabChange` | ui/setUI.js:220 | --- Tab Handling Logic --- |
| `hasUnsavedChanges` | ui/figures/figureModel.js:110 | True when closing this figure subtab would lose work. |
| `hideHelp` | ui/overlay.js:108 | hides the help overlay. |
| `hideOffcanvas` | ui/offcanvas.js:93 | slides the side panel out and removes its backdrop. |
| `historyRoot` | node/scriptHistoryRequests.mjs:41 | The folder VS Code keeps its local history in, on this computer. |
| `hypocycloidPoints` | draw/curves.js:79 | a small circle rolling round the inside of a big one; cusps is how many points the star has (3 a deltoid, 4 an astroid). |
| `ideabookHasScript` | ui/gallery/galleryResults.js:316 | True if the image has a hint script. |
| `ideabookScriptName` | ui/gallery/galleryResults.js:303 | The script's file name for an image: the image's name, with the few characters the dev server will not serve in a file name (& , # ? % + ;) replaced by "_". |
| `ideabookScriptPath` | ui/gallery/galleryResults.js:308 | The app path of an image's hint script (it may not exist). |
| `includedLayers` | ui/figures/figurePrint.js:61 | The layers that print, by index. |
| `incrementHomeResultsRenderToken` | ui/home/homeState.js:40 | counts one more render, so a slow earlier one can tell it is out of date. |
| `initCanvasLayers` | ui/canvasLayerManager.js:117 | Registers the four canvas overlay layers from the DOM. |
| `initDrawTab` | ui/draw/draw.js:119 | starts the Draw tab (fresh, or restored after a rebuild): finds saved settings, builds the subtabs and shows the categories or the open object. |
| `initFiguresTab` | ui/figures/figures.js:131 | Called every time the Figures tab is shown. |
| `initGalleryTab` | ui/gallery/gallery.js:124 | starts the Gallery tab: reads the lists and builds the subtabs and the first view. |
| `initHelpJsTree` | ui/helpTree.js:262 | Initializes (or re-initializes) jsTree in the left pane. |
| `initHomeTab` | ui/home/home.js:100 | starts the Home tab: subtabs, caption, the alert bar and the Home list. |
| `initMenuManager` | ui/menuManager.js:19 | marks the menu manager ready. |
| `initOverlay` | ui/overlay.js:60 | ----- Panel overlays ----- |
| `initPatternsTab` | ui/patterns/patterns.js:92 | starts the Patterns tab: reads the lists and builds the subtabs and the categories view. |
| `initTab` | ui/setUI.js:100 | clears the page and starts a tab (restored true after a rebuild). |
| `initUtilityTab` | ui/utilities/utilities.js:89 | starts the Utilities tab: reads the lists and builds the subtabs and the first view. |
| `inline` | node/copyBuildDocs.mjs:43 | the marks inside one line of text: `code`, **bold**, *italic*, [text](link). |
| `insertLayer` | ui/figures/figureLayers.js:137 | Appends a new layer at the top of the stack with the object's default parameters, makes it active, and redraws. |
| `insertTemplate` | ui/figures/figureTemplates.js:192 | choice is a value from TEMPLATE_CHOICES. |
| `inside` | draw/shapers.js:230 | only the points inside the shape (nails within a boundary, or a pattern trimmed to a frame). |
| `inverseStarParabolas` | draw/drawRegular.js:317 | The parabolas drawInverseStar draws, as data instead of pixels (Break apart, v1-finish item 7), in the same shape as regularPolygonParabolas(). |
| `inverseTransform` | draw/drawTransform.js:100 | The object point that the transform sends to canvas point (x, y). |
| `isHtmlFile` | node/generateHelpManifest.mjs:52 | true for a .html file name. |
| `isImagePath` | ui/home/homeResults.js:180 | true for a picture file (png, jpg, jpeg, webp, gif). |
| `isInside` | draw/shapers.js:216 | is point p inside the closed shape whose corners are given in order? (The even-odd rule: count how many edges a line from p to the right crosses; odd means i... |
| `isInside` | node/safePaths.mjs:73 | True when targetAbs is rootAbs itself or somewhere below it. |
| `isJsPath` | ui/home/homeResults.js:174 | Path type utilities |
| `isRegistryEntry` | ui/draw/drawInstance.js:25 | drawInstance.js Private copies of Draw registry objects Each object in window.drawRegistry is one shared copy. |
| `isRequestAllowed` | node/sketchpadServer.mjs:82 | true when a request comes from Sketchpad's own page (or from this computer with no Origin), and names this service as its host. |
| `isSavedFigure` | ui/figures/figuresSave.js:258 | True when this figure has been saved or opened from a file, so a file for it exists (until Archive moves it away). |
| `isSkippableDir` | node/generateHelpManifest.mjs:57 | folders never scanned (node_modules, .git). |
| `isTemplate` | ui/figures/figureTemplates.js:162 | true for a template object. |
| `itemsOf` | node/libraryIndex.mjs:83 | the items of one category folder, as list entries. |
| `keepLayerOnTop` | ui/figures/figureLayers.js:334 | Moves the active layer to the front of drawOrder, so it stays on top after another layer is chosen and in the saved figure. |
| `launchDetached` | node/logAndEditorRequests.mjs:208 | Starts a command detached from this service. |
| `launchTabViaSetUI` | ui/home/homeNav.js:324 | switches to another main tab (used to open an item there). |
| `layerTransform` | ui/figures/figurePoints.js:153 | The transform of layer number i of the figure, or null. |
| `limaconPoints` | draw/curves.js:102 | r = (1 + loop cos t) / (1 + loop). |
| `lineDiff` | ui/scriptHistory.js:45 | The lines of both texts in order, each marked as kept (" "), removed ("-") or added ("+"). |
| `linePoints` | draw/shapers.js:54 | steps+1 points evenly spaced from a to b, both ends included. |
| `lineSpan` | ui/scriptHistory.js:206 | one line of a comparison, in a colour. |
| `lissajousPoints` | draw/curves.js:60 | x = sin(a t + phase), y = sin(b t). |
| `listFilesByExt` | node/maintain_manifests.mjs:399 | Lists files in a directory that match a specific extension, with exclusion support. |
| `listHelpTopics` | node/homeListRequests.mjs:51 | TASK: listHelpTopics The topics in one help folder, for Home > Help (ui/home/homeHelp.js): every .html file under help/<folder>, with the title from its <title> |
| `listHomeItems` | node/libraryIndex.mjs:139 | the request (see the header above). |
| `listIdeabookScripts` | node/scriptHistoryRequests.mjs:141 | TASK: listIdeabookScripts The hint scripts of one Ideabook category: the .js files in gallery/Ideabook/<category>/scripts/. |
| `listImageFiles` | node/maintain_manifests.mjs:407 | Lists image files in a directory based on standard web extensions. |
| `listInsertableObjects` | ui/figures/figureLayers.js:106 | Registry objects for the Insert pulldown: [{ key, name }], sorted by name. |
| `listLibrary` | node/libraryIndex.mjs:103 | the request. |
| `listLogFiles` | node/logAndEditorRequests.mjs:36 | TASK: listLogFiles DESCRIPTION Returns newest N log files from ./utilities/logfiles. |
| `listScriptHistory` | node/scriptHistoryRequests.mjs:100 | TASK: listScriptHistory Payload:  { path: "/patterns/circles/circle.js" } Returns:  { request, status: "ok", root, found, versions: [ { id, timestamp, iso, s... |
| `listSecondaries` | ui/draw/secondaryObjects.js:54 | Returns the manifest array for a given primary ID. |
| `listThumbnailTargets` | ui/thumbnailMaker.js:52 | every item that should have a thumbnail, in the sets chosen (Patterns, Gallery, Draw, Figures). |
| `loadCategory` | ui/utilities/utilities.js:351 | Legacy Exports (Compatibility) |
| `loadFiguresCategories` | ui/figures/figuresDisplay.js:51 | Reads the category list, then each category's manifest, and hands the result to the shared renderCategories() (ui/categories.js), which draws the same accord... |
| `loadHelpHtmlIntoPane` | ui/helpTree.js:349 | Loads an HTML file and injects the <body> inner HTML into the viewer pane. |
| `loadHelpManifest` | ui/help.js:19 | the help tree (help/manifest.json), read once and kept. |
| `loadHomeManifest` | ui/home/homeManifest.js:44 | loadHomeManifest_async without waiting for it; a failure is reported. |
| `loadHomeManifest_async` | ui/home/homeManifest.js:60 | Home's manifest is a flat array at /home/manifest.json with no directoryRegistry.json. |
| `loadImage` | ui/thumbnailMaker.js:275 | a picture loaded into an Image, when it has loaded. |
| `loadScriptModule` | ui/scriptRunner.js:77 | imports a script file as a module, fresh each time, so it runs as saved. |
| `loadScriptModuleFromText` | ui/scriptRunner.js:143 | Loads script text as a module, as if it were the file at path. |
| `loadSecondary` | ui/draw/secondaryObjects.js:79 | Fetches the JSON content of a secondary object. |
| `loadSecondaryObjectInTab` | ui/draw/drawNav.js:377 | reads one saved setting and opens it in a subtab as a copy of its object with those settings. |
| `loadThumbnailSettings` | ui/thumbnailSettings.js:45 | Called once when this file loads (below). |
| `magicCandidates` | ui/figures/figureMagic.js:148 | Every magic point on the layer's infrastructure, as candidates { layer, arm, t, x, y, feature }. |
| `main` | node/check_ports.mjs:23 | checks that ports 5173 (Vite) and 5174 (the Node service) are free, and stops start-up with a message naming any that are in use. |
| `makeArchiveItem` | ui/menuCmds.js:154 | Returns an Archive menu item. |
| `makeDrawInstance` | ui/draw/drawInstance.js:32 | a private copy of a registry object with its own params (see the header). |
| `makeEditManifestItem` | ui/menuCmds.js:135 | Returns an Edit Manifest menu item. |
| `makeHelpItem` | ui/menuCmds.js:53 | Returns a Help menu item. |
| `makeNotesItem` | ui/menuCmds.js:178 | Returns a Notes menu item for a source file. |
| `makeRingObject` | draw/ringObject.js:59 | a complete registry object from a spec (see the header). |
| `makeRootedPath` | node/manifestRequests.mjs:413 | an entry's file as a path from the project root ("/patterns/circles/circle.js"). |
| `makeRootedPathFromManifest` | node/maintain_manifests.mjs:341 | Converts a filesystem path from a manifest entry into a browser-rooted web path. |
| `makeScriptHistoryItem` | ui/menuCmds.js:94 | Returns a "Script history..." menu item: the versions VS Code saved of the open script, to run or compare (ui/scriptHistory.js). |
| `makeShowScriptItem` | ui/menuCmds.js:73 | Returns a Show Script menu item. |
| `makeThumbnailItem` | ui/menuCmds.js:116 | Returns a Create Thumbnail menu item. |
| `makeTimestampForFilename` | node/serviceFileHelpers.mjs:93 | Returns: YYYYMMDD_HHMMSS |
| `manifestNodeToJsTreeNode` | ui/helpTree.js:121 | Recursive converter from manifest subtree to a jsTree node. |
| `manifestRoots` | node/safePaths.mjs:33 | the absolute paths of the folders that may hold manifests. |
| `mapPoint` | draw/drawTransform.js:162 | being drawn (drawState.transform). |
| `mapTabIdToKey` | ui/setUI.js:51 | a tab button's id as the tab's name ("draw-tab" gives "draw"). |
| `markdownToHtml` | node/copyBuildDocs.mjs:65 | a Markdown document as the HTML of a page body. |
| `markFarthest` | draw/shapers.js:190 | the working part of simplified. |
| `markListsForRedraw` | ui/thumbnailSettings.js:94 | Each tab that lists its items with pictures builds its list again the next time it is opened (the same needsUpdate flag a manifest rebuild uses). |
| `markSelectedThumbnail` | ui/thumbnails.js:7 | thumbnails.js Thumbnail grids (draw, mark the selected one) and making a cropped canvas thumbnail. |
| `markTabClean` | ui/draw/drawNav.js:259 | clears a subtab's changed mark. |
| `markTabDirty` | ui/draw/drawNav.js:239 | marks a subtab as changed since it was opened (a mark on its label). |
| `measureParametricBounds` | draw/drawParametrics.js:178 | Evaluates the curve functions across all sample points to find the mathematical min/max bounding box. |
| `mesh` | draw/connectors.js:151 | a grid given as rows (an array of arrays of points). |
| `midpoint` | draw/drawUtilities.js:494 | the point half way between a and b. |
| `mirrored` | draw/shapers.js:134 | every point reflected across the line through a and b. |
| `moved` | draw/shapers.js:47 | a copy of point p at (x, y). |
| `moveFollowerHandle` | ui/figures/figureWeldMove.js:117 | The delta is in canvas pixels but handles are stored in object space, so: handle to canvas, add the delta, back to object space. |
| `moveFreePoint` | ui/figures/figurePoints.js:321 | Drags a free point to (x, y). |
| `moveHandle` | ui/interactor.js:171 | The one place a handle is moved, by drag or by arrow key. |
| `nailBox` | ui/figures/figurePrint.js:138 | Smallest box round the nails, in canvas pixels. |
| `nailsOf` | ui/figures/figurePrint.js:91 | { source: "discs" \| "stitch ends", nails: [{ x, y, label }], coincident: <how many unwelded discs shared a spot> }. |
| `newBounds` | draw/drawTransform.js:170 | An empty extent: every real point will be smaller than Infinity and larger than -Infinity, so the first noteBounds() call sets all four. |
| `newLayerFields` | ui/figures/figureModel.js:149 | The format fields every new layer gets, beside kind, id, visible, color, params and transform (figureLayers.js insertLayer). |
| `newTransform` | draw/drawTransform.js:63 | A fresh identity transform: no turn, no shift. |
| `nextFigureTabId` | ui/figures/figureModel.js:136 | Smallest "tab-figure-N" id not used in the tabs object. |
| `nextUntitledName` | ui/figures/figureModel.js:121 | Smallest "Untitled N" not used by an open figure tab. |
| `nodeDispatch` | ui/nodeLayer.js:44 | DESCRIPTION Sends a dispatch request to the Node service and returns the JSON response. |
| `nodeListIdeabookScripts` | ui/nodeLayer.js:107 | The Ideabook hint scripts of one category (names without .js). |
| `nodeListLogFiles` | ui/nodeLayer.js:89 | the newest files in utilities/logfiles. |
| `nodeListScriptHistory` | ui/nodeLayer.js:101 | VS Code's saved versions of a script (node/scriptHistoryRequests.mjs). |
| `nodeReadLogFile` | ui/nodeLayer.js:95 | the text of one log file. |
| `nodeReadScriptHistoryVersion` | ui/nodeLayer.js:113 | one saved version of a script, from VS Code's history. |
| `nodeRebuildAndValidateManifests` | ui/nodeLayer.js:119 | asks the service for a complete rebuild of the manifests (Rebuild & Validate). |
| `normalizeGalleryEntryPath` | ui/gallery/galleryResults.js:353 | an entry's file as a path from the project root. |
| `normalizeScriptInfo` | ui/scriptRunner.js:170 | Ensure scriptInfo vocabulary consistency: - scriptInfo.parameters <-> scriptInfo.params |
| `noteBounds` | draw/drawTransform.js:182 | caller has asked for bounds by setting drawState.bounds. |
| `numbersToPoints` | draw/drawUtilities.js:694 | PURPOSE - Normalize mixed “index-or-point” inputs into actual Point objects. |
| `offsetParams` | ui/figures/figureLayers.js:280 | Shifts whatever positions a registry object keeps: its points, midpoint, center or start. |
| `onDomContentLoaded` | ui/setUI.js:236 | start-up: menus, overlays, canvas layers, the registry check, the tab buttons, then the Home tab. |
| `onEscape` | ui/offcanvas.js:88 | Escape closes the side panel. |
| `oneSheetSVG` | ui/figures/figurePrint.js:276 | see the comment block above. |
| `onHelpTreeNodeSelected` | ui/helpTree.js:302 | jsTree selection handler. |
| `onNext` | ui/patterns/patternsDisplay.js:165 | shows the pattern after the current one (the last wraps to the first). |
| `onPrev` | ui/patterns/patternsDisplay.js:137 | shows the pattern before the current one (the first wraps to the last). |
| `onUtilityItemClick` | ui/utilities/utilitiesDisplay.js:83 | runs the utility clicked in a categories frame. |
| `open` | ui/menuManager.js:95 | shows a menu of items below an anchor element; a click on an item runs it, a click elsewhere closes the menu. |
| `openEditManifestDialog` | ui/editManifestDialog.js:43 | Opens the shared "Edit Manifest" dialog. |
| `openErrors` | ui/errorChecklist.js:78 | the errors not yet ticked, as { key, line, count }. |
| `openHelpEditor` | ui/overlay.js:128 | Open the help editor. |
| `openHelpEditorTinyMCE` | ui/helpEditor.js:179 | Reuses the SAME help overlay layer. |
| `openHelpHomeOverlay` | ui/help.js:63 | UPDATED: - This becomes the ONE entry point for opening Help. |
| `openInEditor` | node/logAndEditorRequests.mjs:158 | the request (see the header above). |
| `openInsertPanel` | ui/figures/figureInsertPanel.js:30 | the Insert an object side panel: a picture of every object, a larger preview on hover, click to insert. |
| `openNewFigureTab` | ui/figures/figuresNav.js:459 | Creates an empty, unnamed figure in a new subtab and shows it. |
| `openOverlay` | ui/overlay.js:115 | Panel-style overlay open/close (rarely used) |
| `openSavedFigure` | ui/figures/figuresSave.js:190 | Reads the file, makes a new figure subtab for it and rebuilds the live objects. |
| `openScriptHistory` | ui/scriptHistory.js:72 | the side panel of a script's saved versions. |
| `openSweepPanel` | ui/draw/drawSweep.js:116 | The side panel: setting, from, to, how many, Sweep. |
| `outside` | draw/shapers.js:236 | only the points outside the shape (a hole left in a pattern). |
| `page` | node/copyBuildDocs.mjs:144 | a complete help page around a body. |
| `pagesIn` | node/makeHelpPdf.mjs:30 | the .html files of a help folder, each { file, title }, A to Z by title. |
| `pairsFor` | draw/ringObject.js:50 | the lines for a list of points, by the stitch setting. |
| `pairwise` | draw/connectors.js:49 | point i of A joined to point i+offset of B. |
| `para` | ui/scriptHistory.js:215 | a paragraph holding text. |
| `parseChecklist` | ui/home/homeChecklist.js:36 | the file split into lines, and the items found among them, each { text, done, at } where at is its line number. |
| `parseErrorLog` | ui/homeAlert.js:59 | The error log (errors_<date>.txt, written by appendErrorLog in node/logAndEditorRequests.mjs): every line that starts with a date is one error. |
| `parseMaintenanceSummary` | ui/homeAlert.js:39 | the problems listed at the top of a manifest check log. |
| `parseValueList` | ui/draw/drawSweep.js:83 | A list typed by Barry ("3, 5, 8, 13") as numbers; anything that is not a number is left out. |
| `part` | draw/shapers.js:87 | the points from index `from` up to, but not including, index `to`. |
| `patternsThumb` | ui/thumbnailSettings.js:110 | where a pattern's thumbnail picture is. |
| `pictureOf` | ui/draw/drawSweep.js:90 | One picture of the open object with some settings changed (overrides is { key: value, ... |
| `placeOf` | ui/errorReport.js:97 | The file and line an error was raised at, from the first line of its stack that names a file of ours ("ui/figures/figureDraw.js:104"). |
| `pointAtArcLength` | draw/drawEllipse.js:198 | Given cumulative arc-lengths (S) and corresponding points (X), returns the interpolated point at the specified arc length. |
| `pointByN` | ui/figures/figureWeldModel.js:37 | the figure's point (disc) with number n, or null. |
| `pointPickerDotId` | ui/controls/shared/helpers.js:9 | Generate a unique dot ID for point picker overlays |
| `polygonPoints` | draw/curves.js:169 | a regular polygon of the given number of sides, corners on a circle of radius r, the first corner at the top, n points spread round its sides. |
| `polyline` | draw/connectors.js:140 | each point joined to the next. |
| `polyline` | ui/figures/figureMagic.js:60 | The arm as a list of canvas points, each with its t along the arm. |
| `positionMenu` | ui/menuManager.js:66 | places the menu just below the button that opened it. |
| `prepareCategoryFolder` | node/writerRequests.mjs:22 | Finds <rootDir>/<category>, makes its images/ folder if it is missing, and checks its manifest.json exists. |
| `prepareSharedCanvas` | ui/thumbnailMaker.js:260 | Puts the shared canvas in #sketchpad on a white page, as running a script does. |
| `printCircNum` | draw/drawUtilities.js:504 | a number in a small circle at pt (in Final mode it only counts, drawState.ctr). |
| `printTemplate` | ui/figures/figurePrint.js:396 | Opens the template in its own window, one sheet per page, ready to print. |
| `printText` | draw/drawUtilities.js:523 | text drawn at pt. |
| `printTitle` | draw/drawUtilities.js:545 | sets the drawing's title (drawState.title). |
| `probe` | node/check_ports.mjs:4 | tries to open a server on port; answers whether the port is free. |
| `processDrawRegistry` | node/maintain_manifests.mjs:277 | Performs text analysis on DrawRegistry files to extract metadata (id, status, name). |
| `processGalleryImages` | node/maintain_manifests.mjs:147 | Scans Ideabook and Patterns domains in the gallery for image files. |
| `processGalleryScripts` | node/maintain_manifests.mjs:117 | Scans the gallery/Scripts directory and updates local manifests. |
| `processPatterns` | node/maintain_manifests.mjs:84 | Scans the patterns directory and updates local manifest.json files. |
| `processUtilities` | node/maintain_manifests.mjs:180 | Scans Utilities/Tools and Utilities/Lab directories for script files. |
| `propagateAfterChange` | ui/figures/figureWeldMove.js:235 | Compares the welded discs of layerIndex against snapshot (from snapshotWeldMembers, taken before the change) and walks the weld graph outward for every one t... |
| `ptsOnLine` | draw/drawUtilities.js:580 | PTSONLINE Generate equally spaced points along a line segment, using transforms stored in thing.lineTransform. |
| `ptsOnStraightLine` | draw/drawUtilities.js:589 | --- base helper: straight interpolation --- |
| `purge` | ui/errorChecklist.js:86 | write "Purged: <key>" for each key, so those errors no longer appear, even with Show all. |
| `readErrorStates` | ui/errorChecklist.js:102 | every error from every error log the service lists, read oldest first, with its state (errorStates). |
| `readJson` | node/maintain_manifests.mjs:394 | Synchronously reads and parses a JSON file. |
| `readJsonBody` | node/sketchpadServer.mjs:255 | DESCRIPTION Reads the entire request body and parses it as JSON. |
| `readJsonFileSync` | node/serviceFileHelpers.mjs:23 | Reads and parses a JSON file. |
| `readJsonQuietly` | node/libraryIndex.mjs:64 | a JSON file's contents, or the fallback if it is missing or unreadable (a broken notes file must not break a list). |
| `readLogFile` | node/logAndEditorRequests.mjs:101 | TASK: readLogFile DESCRIPTION Reads one logfile from ./utilities/logfiles and returns text. |
| `readOpenErrors` | ui/errorChecklist.js:120 | the errors not yet ticked (for Home's alert). |
| `readQuietly` | ui/homeAlert.js:162 | A log's text, or "" if it cannot be read. |
| `readScriptHistoryVersion` | node/scriptHistoryRequests.mjs:119 | TASK: readScriptHistoryVersion Payload:  { path, id }   id as listScriptHistory gave it Returns:  { request, status: "ok", id, timestamp, text } |
| `readSecondaryObject` | node/secondaryRequests.mjs:225 | TASK: readSecondaryObject |
| `rebuildAllManifests` | ui/rebuildSync.js:44 | The complete rebuild (Barry's rule): after anything changes a manifest -- Edit Manifest, Archive, saving a figure, Create Pattern, Create Gallery PNG -- the ... |
| `rebuildControls` | ui/controls/rendering/rebuild.js:33 | CONTROL PANEL REBUILD TRIGGER PURPOSE: Provides a self-contained rebuild mechanism for dynamic |
| `rebuildInstances` | ui/figures/figureLayers.js:245 | For a figure that was read from a file (Phase 10): makes one live object per saved layer, in the same order, the way insertLayer() makes one. |
| `rectanglePoints` | draw/curves.js:159 | a rectangle of half-width r and half-height r * ratio, with n points spread round its sides from the top left corner. |
| `redrawFigure` | ui/figures/figureDraw.js:65 | Clears the canvas and draws every visible layer, bottom to top. |
| `reflectionFileName` | ui/home/homeHelp.js:49 | a title turned into a file name: letters, digits and spaces kept, everything else dropped, spaces as underscores. |
| `reflowNotes` | ui/notes.js:73 | Header notes are hard-wrapped for the editor. |
| `refreshGalleryFromManifestEdit` | ui/gallery/galleryMenuCmds.js:260 | forgets the Gallery and Home lists and reads them again, after an edit. |
| `refreshHomeCategoriesFromManifestEdit` | ui/home/homeManifest.js:124 | reads the Home list again after an edit and shows it. |
| `refreshInteractor` | ui/interactor.js:92 | Redraws the handles of the armed object. |
| `refreshPoints` | ui/figures/figurePoints.js:370 | Recomputes where each anchored point is from its layer's current geometry, keeping its fraction t. |
| `refreshUtilitiesFromManifestEdit` | ui/utilities/utilities.js:217 | reads the Utilities and Home lists again after an edit. |
| `regenerateThumbnails` | ui/thumbnailMaker.js:140 | Makes every picture again, replacing the old ones (or only the targets handed in as onlyTargets, for "make the missing ones"). |
| `registerTemplates` | ui/figures/figureTemplates.js:153 | adds the template objects to the draw registry (for Figures only). |
| `registryKeyOf` | ui/draw/drawInstance.js:43 | Walks from the object to the shared copy it was made from (a copy's prototype is the shared copy), and returns that copy's registry key. |
| `regularPolygonParabolas` | draw/drawRegular.js:288 | The parts drawRegularPolygon draws, as data instead of pixels (Phase 7c, Break apart). |
| `rehydratePatternsState` | ui/patterns/patterns.js:202 | brings back the Patterns state kept in the browser session, if any. |
| `removeFromWeld` | ui/figures/figureWeldModel.js:96 | Drops point n out of its weld group, dissolving the group if that leaves fewer than two members. |
| `removePointPickerDots` | ui/controls/shared/helpers.js:16 | Remove all point picker dots from a container |
| `render` | ui/interactor.js:180 | CRITICAL SAFETY: If the interactor is disarmed, the signal is aborted. |
| `renderCategories` | ui/categories.js:55 | Render an array of category frames into the specified target container. |
| `renderDrawCategories` | ui/draw/drawCategories.js:86 | the Draw categories view: a frame per category with each object's picture or name. |
| `renderHomeCategories` | ui/home/homeNav.js:230 | the Home categories view: a frame per status. |
| `renderHomeCategoriesIfReady` | ui/home/homeNav.js:210 | shows the Home categories if the list has been read, otherwise says it is loading. |
| `renderHomeChecklist` | ui/home/homeChecklist.js:48 | read the file, show the list, and wire the changes. |
| `renderHomeErrors` | ui/home/homeErrors.js:24 | read the logs, then show the list. |
| `renderHomeHelp` | ui/home/homeHelp.js:101 | the buttons, the tree and the page pane, side by side. |
| `renderHomeImageEntryToText` | ui/home/homeResults.js:118 | shows a picture item in #text. |
| `renderHomeJsEntryToCanvas` | ui/home/homeResults.js:91 | runs a script item on the canvas. |
| `renderHomeNotes` | ui/home/homeNotes.js:21 | the two buttons and the file's text as it stands. |
| `renderHomeResults` | ui/home/homeResults.js:39 | shows the item chosen on Home: a script runs on the canvas, a picture is shown. |
| `renderLayerPanel` | ui/figures/figureLayerPanel.js:44 | Layer numbers go in the gray strip left of the canvas (#figure-sidebar); a hidden layer's number is grayed and struck through. |
| `renderParameterControls` | ui/controls/rendering/renderer.js:23 | builds the controls listed in controlData into the tab's controls area (and its interface area for interface controls). |
| `renderPattern` | draw/drawEllipse.js:19 | INTERNAL EXECUTION ENGINE Consolidated logic for drawing patterns within a set of nodes. |
| `renderPatternThumbGrid` | ui/patterns/patternsDisplay.js:36 | the pictures of one Patterns category. |
| `renderScaffoldGuides` | ui/draw/drawRunner.js:92 | Renders the dashed scaffolding for the active drawing's primary arm. |
| `renderSubtabs` | ui/figures/figuresNav.js:105 | Rebuilds the whole bar from uiState.figures.tabs. |
| `renderTarget` | ui/thumbnailMaker.js:203 | Draws the target on the shared canvas and returns the canvas, or null when the target is skipped. |
| `renderThumbnailGrid` | ui/thumbnails.js:22 | a grid of pictures in a region, each running onClick when clicked. |
| `renderTickList` | ui/home/homeTickList.js:32 | fill container with the controls and the list. |
| `reportError` | ui/errorReport.js:56 | where: a few words naming what was running ("Figure layer 3 (parabola)"). |
| `reportProblems` | ui/errorReport.js:90 | For a check that finds several problems (the registry check, a figure file check): each problem text is reported as its own error. |
| `reportServerError` | node/sketchpadServer.mjs:104 | says in plain words that the service cannot start because the port is taken (a second Sketchpad is probably running), then exits so the launcher stops too in... |
| `resampled` | draw/shapers.js:148 | n points spaced evenly by distance along the path the points make (corner to corner, not closed). |
| `resetActiveDrawObject` | ui/draw/drawMenuCmds.js:306 | puts the open object's settings back to its defaults (Reset Parameters). |
| `resetCanvas` | draw/drawState.js:81 | Clears the bitmap and resets the context state. |
| `resetDrawStateForScript` | draw/drawState.js:65 | Puts drawState back to its starting values before a pattern or gallery script runs, so nothing one script leaves behind reaches the next: the point list (pts... |
| `resetFiguresState` | ui/figures/figuresState.js:84 | Reset (used by init) NOTE: Does NOT clear figuresRegistry -- that cache persists across navigation and is only cleared by explicit cache |
| `resetFigureTab` | ui/figures/figuresSave.js:302 | Throws away the changes since the last save: reads the saved file again and rebuilds the figure from it. |
| `resetGalleryState` | ui/gallery/galleryState.js:71 | forgets the area, category, list and position. |
| `resetHomeState` | ui/home/homeState.js:53 | NOTE: homeResultsRenderToken is intentionally NOT reset to 0 here -- resetting it could cause a stale in-flight render from the previous session to match the... |
| `resetPatternsState` | ui/patterns/patternsState.js:59 | Reset (used by init) |
| `resetUtilitiesState` | ui/utilities/utilitiesState.js:67 | NOTE: hasRunUtility is NOT reset -- it persists for the session to keep the Result tab visible. |
| `resolveInside` | node/safePaths.mjs:88 | Joins rootAbs and a relative path from the caller. |
| `resolveManifestPathAllowed` | node/manifestRequests.mjs:344 | DESCRIPTION Resolves a UI-provided manifest path safely and ensures it remains inside ONE of the allowed roots. |
| `restoreDrawTab` | ui/draw/draw.js:166 | shows the Draw tab again as it was left, handling a launch from Home if one is waiting. |
| `restoreGalleryTab` | ui/gallery/gallery.js:172 | shows the Gallery tab again as it was left. |
| `restoreHomeTab` | ui/home/home.js:136 | shows the Home tab again in the view it was left in. |
| `restorePatternsTab` | ui/patterns/patterns.js:136 | shows the Patterns tab again as it was left. |
| `restoreTab` | ui/setUI.js:90 | Lifecycle: Restore & Init |
| `restoreUtilityTab` | ui/utilities/utilities.js:164 | shows the Utilities tab again as it was left. |
| `reversed` | draw/shapers.js:79 | the same points in the opposite order. |
| `rgbToHex` | draw/color.js:47 | RGB → hex helper |
| `ring` | draw/curves.js:38 | n points, point i at parameter t = i/n of a full turn, from a function giving the point (as a fraction of r) for an angle t. |
| `rosePoints` | draw/curves.js:52 | the rose curve r = cos(k t). |
| `rotated` | draw/shapers.js:118 | every point turned about centre c by deg degrees. |
| `rotateStart` | draw/shapers.js:103 | treat the points as a closed loop and start it at index k. |
| `rotateTransformAbout` | draw/drawTransform.js:140 | Turns the whole picture by d radians about the canvas point (cx, cy). |
| `rulerText` | ui/figures/figureTemplates.js:224 | "Ruler: 300 px (150.0 mm)" for a ruler layer, else "". |
| `run` | ui/scriptHistory.js:160 | Runs the script at scriptPath, or text in its place; true if it ran. |
| `runManifestMaintenance` | node/maintain_manifests.mjs:28 | Main entry point for the maintenance script. |
| `runPattern` | ui/draw/drawExport.js:194 | (no comment) |
| `runScriptByPath` | ui/scriptRunner.js:396 | 1. |
| `runSetUI` | ui/setUI.js:183 | the work of one tab switch, noting each stage so a failure can say where it stopped. |
| `runUtilityEntry` | ui/utilities/utilitiesDisplay.js:116 | loads and runs one utility script, with its caption and controls. |
| `runUtilityItem` | ui/utilities/utilities.js:361 | not used: utilities run through onUtilityItemClick (throws if called). |
| `sameFile` | node/scriptHistoryRequests.mjs:64 | Two file paths are the same file (Windows ignores case). |
| `saveActiveDrawObjectAsSecondary` | ui/draw/drawMenuCmds.js:374 | Secondary Object Commands |
| `saveActiveSecondaryObject` | ui/draw/drawMenuCmds.js:411 | saves the open saved-settings object (a secondary) with its present settings. |
| `saveDrawState` | ui/draw/draw.js:199 | keeps each open Draw subtab's object key and settings, so the tab can be restored. |
| `saveFigure` | node/figureFiles.mjs:53 | writes figures/<category>/<name>.json atomically; refuses to overwrite unless asked (see the header). |
| `saveFigureAs` | ui/figures/figuresSave.js:74 | Asks for a category and a name, then saves. |
| `saveFigureTab` | ui/figures/figuresSave.js:56 | Save. |
| `saveGalleryState` | ui/gallery/gallery.js:228 | The gallery writes uiState.gallery.saved itself as it navigates. |
| `saveHelpFile` | ui/helpEditor.js:263 | Writes Help HTML via Node dispatch: request: "writeHelpFile" payload: { helpPath, html } |
| `saveHomeState` | ui/home/home.js:155 | Home's remembered state (the view and the item open). |
| `saveOneSheetSVG` | ui/figures/figurePrint.js:305 | Downloads oneSheetSVG as <figure name>.svg. |
| `savePatternsState` | ui/patterns/patterns.js:179 | the Patterns tab's remembered state (view, category, item). |
| `saveSecondary` | ui/draw/secondaryObjects.js:20 | Persists a secondary object configuration + thumbnail. |
| `saveSecondaryObject` | node/secondaryRequests.mjs:24 | TASK: saveSecondaryObject Saves one set of Draw settings (a secondary object) as JSON plus a thumbnail under drawRegistry/<primaryId>/, and adds it to that |
| `saveThumbnailSettings` | ui/thumbnailSettings.js:60 | keeps the thumbnail settings in the browser (on or off, size). |
| `saveUtilityState` | ui/utilities/utilities.js:196 | the Utilities tab's remembered state (subtab, category, item). |
| `saysNothing` | ui/controls/builders/conventions.js:53 | true when a control gives no widget of its own, so the table may fill it. |
| `scaled` | draw/shapers.js:127 | every point moved toward or away from centre c by factor k. |
| `scanDir` | node/generateHelpManifest.mjs:67 | one folder of help/ as the manifest shape: its page names, or an object of its subfolders. |
| `scriptFile` | node/scriptHistoryRequests.mjs:51 | An app path ("/patterns/circles/circle.js") as a file in the repo. |
| `selectLayer` | ui/figures/figureLayers.js:307 | Makes a layer active (a click on its number in the strip). |
| `sendCorsPreflight` | node/sketchpadServer.mjs:323 | DESCRIPTION Responds to browser CORS preflight for POST /dispatch. |
| `sendJson` | node/sketchpadServer.mjs:300 | DESCRIPTION Writes a JSON response with the given HTTP status and includes dev CORS headers for localhost UI access. |
| `sendSave` | ui/figures/figuresSave.js:101 | One round trip. |
| `setAccordionControl` | ui/controls/widgets/accordionWidget.js:10 | an accordion (sections that open and close) holding buttons or items, for one control. |
| `setActiveItem` | ui/categories.js:250 | Marks the clicked item as active within the rendered frame. |
| `setActiveTab` | ui/setUI.js:40 | Helpers |
| `setButtonControl` | ui/controls/widgets/buttonWidget.js:8 | Resolve the action function (fail-fast) |
| `setCaptionBar` | ui/caption.js:54 | Builds the caption bar. |
| `setCheckboxControl` | ui/controls/widgets/checkboxWidget.js:9 | a checkbox control; ticking it sets the parameter and redraws. |
| `setColorControl` | ui/controls/widgets/colorWidget.js:18 | a colour control (the browser's colour picker); a new colour sets the parameter and redraws. |
| `setCommandsButtonHandler` | ui/commandsButton.js:34 | Replaces the Commands button click handler deterministically. |
| `setCommandsButtonLabel` | ui/commandsButton.js:16 | Set the Commands button label for the active top-level tab. |
| `setCurrentCategory` | ui/gallery/galleryState.js:61 | records the category shown. |
| `setCurrentCategory` | ui/patterns/patternsState.js:46 | Setters |
| `setCurrentCategory` | ui/utilities/utilitiesState.js:53 | records the category shown. |
| `setCurrentDomain` | ui/gallery/galleryState.js:59 | records the Gallery area shown. |
| `setCurrentDomain` | ui/utilities/utilitiesState.js:51 | Setters |
| `setCurrentIndex` | ui/gallery/galleryState.js:64 | resetGalleryState() |
| `setCurrentIndex` | ui/patterns/patternsState.js:51 | records the position of the pattern shown. |
| `setCurrentIndex` | ui/utilities/utilitiesState.js:57 | records the position in that list. |
| `setCurrentList` | ui/gallery/galleryState.js:63 | records the list being stepped through. |
| `setCurrentList` | ui/utilities/utilitiesState.js:55 | records the list being stepped through. |
| `setCurrentTabId` | ui/figures/figuresState.js:71 | records the figure subtab now shown. |
| `setDefaultControl` | ui/controls/widgets/textWidget.js:9 | a text box (or the input type the control names), the control used when no other fits. |
| `setDrawAction` | ui/draw/drawMenuCmds.js:189 | No-op placeholder -- parameter controls are injected directly by the draw object's own init()/render(). |
| `setDrawSketchpad` | ui/draw/drawRunner.js:128 | makes the item's subtab active and draws it. |
| `setDrawSubtabs` | ui/draw/drawNav.js:65 | builds the Draw subtab bar: Categories, then a subtab for each open object. |
| `setDrawText` | ui/draw/drawCategories.js:39 | shows the Draw categories in #text. |
| `setFiguresAction` | ui/figures/figures.js:232 | Builds the Figures controls in the permanent #button div, under the Commands button, in this order: Show All checkbox      (figure subtabs only) |
| `setFiguresCaption` | ui/figures/figuresCommands.js:133 | title    - caption text (default "Figures") withMenu - true on a figure subtab: shows the "v" menu The menu items are built fresh each time the "v" is pressed |
| `setFiguresRegistry` | ui/figures/figuresState.js:66 | Setters |
| `setFiguresSketchpad` | ui/figures/figures.js:328 | Moves the one shared drawing canvas (window.drawCanvas, used by every tab) into this tab's #sketchpad region, unless it is already there. |
| `setFiguresSubtabs` | ui/figures/figuresNav.js:75 | figuresSave.js asks for a figure to be shown (after Save, or opening a saved one) with this event, because it cannot import this file. |
| `setFiguresText` | ui/figures/figures.js:320 | The #text region holds the category list. |
| `setGalleryCache` | ui/gallery/galleryState.js:57 | Setters |
| `setHasRunUtility` | ui/utilities/utilitiesState.js:58 | resetUtilitiesState() NOTE: hasRunUtility is NOT reset -- it persists for the session to keep the Result tab visible. |
| `setHelpBrowserDefaultPage` | ui/helpTree.js:374 | Forces the right pane to show /help/index.html every time the Help Browser overlay opens. |
| `setHiddenControl` | ui/controls/widgets/hiddenWidget.js:6 | controls/widgets/hiddenWidget.js HIDDEN WIDGET |
| `setHomeAction` | ui/home/home.js:183 | empties #action (Home has no controls). |
| `setHomeCaption` | ui/home/homeMenuCmds.js:58 | the caption bar with just a title. |
| `setHomeCaptionForResult` | ui/home/homeMenuCmds.js:74 | the caption for an item opened from Home: where it comes from, its title, Prev and Next, and the menu. |
| `setHomeManifestGrouped` | ui/home/homeState.js:37 | Setters |
| `setHomeSketchpad` | ui/home/home.js:190 | empties the canvas area and hides it. |
| `setHomeSubtabs` | ui/home/homeNav.js:124 | builds Home's subtab bar. |
| `setHomeText` | ui/home/home.js:173 | Region builder stubs |
| `setIdsWithSecondaries` | ui/draw/drawTabState.js:43 | Setter |
| `setInstrumenting` | ui/instrument.js:64 | turns timing on or off. |
| `setLayerVisible` | ui/figures/figureLayers.js:392 | The Show checkbox in the caption bar. |
| `setNailSize` | ui/figures/figurePrint.js:221 | asks for the nail diameter and clearance, in the print units, and keeps them in millimetres. |
| `setNumberControl` | ui/controls/widgets/numberWidget.js:22 | -- Build the input ---------------------------------------- |
| `setPatternsSubtabs` | ui/patterns/patternsNav.js:44 | the Patterns subtab bar: Categories, and the Pattern subtab when one is open. |
| `setPrintSize` | ui/figures/figurePrint.js:201 | Ask for the printed width of the nails (mm), or the nail diameter and clearance (mm). |
| `setPt` | draw/drawUtilities.js:756 | adds a point to drawState.pts, draws its number unless draw is false, and returns its index. |
| `setRadioControl` | ui/controls/widgets/radioWidget.js:10 | a group of radio buttons, one per option; choosing one sets the parameter and redraws. |
| `setRangeControl` | ui/controls/widgets/rangeWidget.js:198 | a slider with its minimum, maximum and current value shown. |
| `setRangeControlUnified` | ui/controls/widgets/rangeWidget.js:11 | a slider, either with a header row (rangeHeader) or the plain kind. |
| `setRangeHeaderControl` | ui/controls/widgets/rangeWidget.js:44 | DESCRIPTION Alternate range control UI: - header line: "Label: <value>" |
| `setSelectControl` | ui/controls/widgets/selectWidget.js:10 | a drop-down list of the options; choosing one sets the parameter and redraws. |
| `setStaticTextControl` | ui/controls/widgets/textWidget.js:33 | point picker helpers (local to parameterControls.js) |
| `setThumbnailGridControl` | ui/controls/widgets/thumbnailWidget.js:11 | a grid of small pictures, one per option; clicking one chooses it. |
| `setThumbnailSize` | ui/thumbnailSettings.js:78 | Returns the size actually set (clamped and rounded). |
| `setThumbnailsOn` | ui/thumbnailSettings.js:70 | turns pictures in the category lists on or off. |
| `setUI` | ui/setUI.js:155 | switches tab; a newer click replaces one still waiting, and switches run one at a time. |
| `setUtilityCategories` | ui/utilities/utilitiesDisplay.js:39 | the categories view of Tools or Lab: a frame per category. |
| `setUtilitySubtabs` | ui/utilities/utilitiesNav.js:86 | builds the Utilities subtab bar. |
| `setVariantAndRedraw` | drawRegistry/parametrics.js:74 | switch the Parametrics curve to another variant (Four Circles, Four Ended ...) and draw it again. |
| `showBar` | ui/errorReport.js:116 | The error bar |
| `showCategoryList` | ui/patterns/patternsNav.js:151 | the Patterns categories view: a frame per category. |
| `showDiff` | ui/scriptHistory.js:176 | shows two texts line by line, removed lines in red and added lines in green. |
| `showGalleryImage` | ui/gallery/galleryResults.js:221 | puts one picture in #text. |
| `showGalleryResultsImages` | ui/gallery/galleryResults.js:55 | shows one picture of a category, from startIndex, with Prev and Next. |
| `showGalleryResultsScripts` | ui/gallery/galleryResults.js:113 | runs one script of a category on the canvas, with Prev and Next. |
| `showGalleryScript` | ui/gallery/galleryResults.js:249 | loads and runs one gallery script, with its controls. |
| `showGalleryScriptSource` | ui/gallery/galleryMenuCmds.js:168 | shows a gallery script's source text. |
| `showHelp` | ui/overlay.js:102 | Help Overlay |
| `showHelpOverlay` | ui/overlay.js:136 | overlay.js  (REPLACE showHelpOverlay with this version) |
| `showHomeAlert` | ui/homeAlert.js:74 | Two parts, each shown only when it has something to say and has not been dismissed: - the newest manifest check, when it found problems; |
| `showHomeResultsError` | ui/home/homeResults.js:156 | a message in the canvas area saying the item could not be shown. |
| `showIdeabookCategories` | ui/gallery/galleryNav.js:200 | the Ideabook view: a frame per category of pictures. |
| `showLine` | ui/draw/drawStep.js:99 | draw up to line k (1 is the first line) and update the readout. |
| `showNextGalleryItem` | ui/gallery/galleryResults.js:187 | shows the item after the current one (the last wraps to the first). |
| `showNotesOverlay` | ui/overlay.js:225 | Shows a file's header notes in the same "help" overlay layer and with the same toolbar and body classes as showHelpOverlay. |
| `showOffcanvas` | ui/offcanvas.js:23 | Unified offcanvas display function. |
| `showPage` | ui/home/homeHelp.js:88 | load one help page into the right pane (its <body> only). |
| `showPanel` | ui/offcanvas.js:60 | Show #offcanvasPanel as it stands (a caller that filled it in itself uses this). |
| `showPatternsCategories` | ui/gallery/galleryNav.js:235 | the gallery Patterns view: a frame per category of pictures. |
| `showPatternScript` | ui/patterns/patternsMenuCmds.js:196 | shows the pattern script's source text. |
| `showPrevGalleryItem` | ui/gallery/galleryResults.js:150 | shows the item before the current one (the first wraps to the last). |
| `showScriptOffcanvas` | ui/scriptView.js:16 | the side panel showing a script's source text. |
| `showScriptsCategories` | ui/gallery/galleryNav.js:270 | the gallery Scripts view: a frame per category of scripts. |
| `showSecondaryOffcanvas` | ui/draw/drawNav.js:340 | the side panel listing an object's saved settings; choosing one opens it. |
| `showSelectedPattern` | ui/patterns/patternsDisplay.js:75 | runs one pattern of a category on the canvas and sets the caption. |
| `showWeldNotice` | ui/figures/figurePointer.js:120 | A short-lived note in the caption bar (Phase 8: weld created, removed, or nothing nearby to weld). |
| `simplified` | draw/shapers.js:178 | drop points that change nothing. |
| `snapshotOfFigure` | ui/figures/figureModel.js:102 | The figure as text, for telling whether it changed since it was last saved or opened. |
| `snapshotWeldMembers` | ui/figures/figureWeldMove.js:75 | The current canvas position of every welded disc on one layer, taken just before that layer is about to change. |
| `sortCaseInsensitive` | node/generateHelpManifest.mjs:62 | compares two names ignoring upper and lower case, for sorting. |
| `spacingProblems` | ui/figures/figurePrint.js:150 | { ok, message, pairs: [[nailA, nailB, mm]], nails }. |
| `spiralPoints` | draw/curves.js:119 | an Archimedean spiral from the centre out to r, turns turns. |
| `startClock` | draw/drawState.js:167 | the drawing named by what may run for drawState.timeLimit milliseconds from now. |
| `startServer` | node/sketchpadServer.mjs:126 | DESCRIPTION Creates and starts the HTTP server. |
| `startStepping` | ui/draw/drawStep.js:50 | draw everything once to count the lines, then show the controls with the last line marked. |
| `statusForError` | node/sketchpadServer.mjs:93 | A plain Error thrown by a handler for bad input has no system error code and says what is wrong with the request. |
| `stepLayer` | ui/draw/drawStep.js:74 | called by the figure redraw before each layer draws. |
| `stitcher` | draw/drawUtilities.js:554 |    returns an array of lines |
| `stopClock` | draw/drawState.js:174 | the drawing has finished; no limit applies until the next start. |
| `stopStepping` | ui/draw/drawStep.js:62 | remove the controls and draw the whole picture again. |
| `stripExt` | node/maintain_manifests.mjs:414 | Removes the specified extension from a string. |
| `summaryLines` | node/maintain_manifests.mjs:266 | The lines that go at the top of the log: the problems, then the files added to manifests. |
| `superellipsePoints` | draw/curves.js:110 | \|x\|^p + \|y\|^p = 1. |
| `sweepableSettings` | ui/draw/drawSweep.js:37 | The settings a sweep can run over: every slider (range control), as { key, label, min, max, step }. |
| `sweepGrid` | ui/draw/drawSweep.js:74 | A grid over two settings: one row per value of keyB (down), one picture per value of keyA (across). |
| `sweepPictures` | ui/draw/drawSweep.js:65 | One picture (a data URL) per value, of the open object with key set to it. |
| `sweepValues` | ui/draw/drawSweep.js:47 | count values evenly across from..to, each on one of the slider's steps. |
| `switchHomeView` | ui/home/homeNav.js:146 | shows one of Home's views (Categories, Results, Errors, Checklist, Help, Notes) and remembers it. |
| `switchTab` | ui/draw/drawNav.js:198 | makes a subtab the active one and draws what it holds. |
| `switchToCategories` | ui/figures/figuresNav.js:382 | Shows the category list (#text) and hides the drawing area, the layer strip and the controls. |
| `switchToFigureTab` | ui/figures/figuresNav.js:421 | Shows one figure: hides the category list, shows the drawing area and the layer strip, builds the caption bar and its tools, then the layer panel (which also... |
| `switchUtilityTab` | ui/utilities/utilitiesNav.js:104 | shows one Utilities subtab and remembers it. |
| `syncLayerToCanvas` | ui/canvasLayerManager.js:152 | Sizes and positions the named canvas layer to exactly match the dimensions of referenceCanvas. |
| `syncSystemStateAfterRebuild` | ui/rebuildSync.js:16 | Global Sync: Wipes the manifest cache and sets needsUpdate for all tabs. |
| `tableRow` | node/copyBuildDocs.mjs:57 | the cells of one Markdown table line ("\| a \| b \|"). |
| `templatePages` | ui/figures/figurePrint.js:327 | The template as { pages: [svg text], sheets: { rows, cols }, widthMm, heightMm, nails }. |
| `textColorOn` | ui/figures/figureLayerPanel.js:185 | Black or white, whichever reads better on the given background. |
| `thumbFromEntryPath` | ui/thumbnailSettings.js:139 | Home lists entries from every tab, each with the path of its file: /patterns/<category>/<name>.js /gallery/<domain>/<category>/<name>.js (or an image) |
| `tick` | ui/errorReport.js:168 | Acknowledges one error in the log. |
| `timed` | ui/instrument.js:47 | work is a function that returns a promise (or a plain value). |
| `timesTable` | draw/connectors.js:117 | round a loop of n points, point i joined to point (i*factor) mod n. |
| `titleOf` | node/copyBuildDocs.mjs:137 | the first heading of a Markdown document, else the fallback. |
| `toCanvas` | ui/interactor.js:157 | Handles live in object space. |
| `toggleAccordionSection` | ui/controls/widgets/accordionWidget.js:223 | Opens a closed section (and closes the others, so one section is open at a time) or closes an open one. |
| `toggleIdeabookScript` | ui/gallery/galleryResults.js:328 | Run script / Show image. |
| `toggleWeldAt` | ui/figures/figureWelds.js:135 | The right-click action. |
| `toHexColor` | ui/controls/widgets/colorWidget.js:51 | Any CSS color text as "#rrggbb". |
| `toObject` | ui/interactor.js:162 | canvas coordinates as the armed object's own coordinates (back through its layer transform). |
| `topicsOf` | ui/home/homeHelp.js:56 | the topics of one help folder, A to Z by title. |
| `toSafeName` | node/createFigureService.mjs:250 | Helpers |
| `toUnits` | ui/figures/figurePrint.js:248 | A length in mm, shown in the print units: 3 decimals for inches, 1 for mm. |
| `translated` | draw/shapers.js:112 | every point moved by dx, dy. |
| `translateTransform` | draw/drawTransform.js:121 | The same transform, moved (dx, dy) canvas pixels. |
| `translateWholeLayer` | ui/figures/figureWeldMove.js:131 | The fallback for a node with no real handle of its own. |
| `treeData` | ui/home/homeHelp.js:69 | the jsTree nodes. |
| `trimmedRange` | draw/drawRegular.js:421 | The same clamp changeLine() applies, but returning the index window { from, to } instead of a cut-down array. |
| `unitName` | ui/figures/figurePrint.js:243 | "inches" or "millimetres", for questions. |
| `updateDrawCaption` | ui/draw/drawMenuCmds.js:61 | Builds the full caption bar for a draw object tab. |
| `updateFigureButtons` | ui/figures/figuresNav.js:283 | The left command area. |
| `updateGalleryCaption` | ui/gallery/galleryMenuCmds.js:61 | the caption for the item shown: its category and title, Prev and Next, and the menu. |
| `updateLayerInfo` | ui/figures/figureLayerPanel.js:202 | Fills the "Layer N . |
| `updatePatternsCaption` | ui/patterns/patternsMenuCmds.js:53 | Title rule: "{category}: {title}" |
| `updateReadout` | ui/draw/drawStep.js:109 | slider range and position, and the words under it. |
| `updateSecondariesDiscovery` | ui/draw/drawNav.js:324 | asks the service which objects have saved settings, so their category entries can say so. |
| `updateUtilitiesCaption` | ui/utilities/utilitiesMenuCmds.js:37 | the caption for the utility shown: its category and title, and the menu. |
| `upgradeFigureV1` | ui/figures/figureModel.js:167 | Fills in any format field a figure is missing, with its default, so a file written before a field existed opens the same as a new one. |
| `validateEditManifestSpec` | ui/editManifestDialog.js:71 | checks that an Edit Manifest request names the manifest, the field to match and the entry, and throws if not. |
| `validateItems` | ui/menuManager.js:40 | checks that each menu item has a label and an onClick, and throws if not. |
| `validateLinkMode` | classes/linkedCircles.js:164 | Ensures mode is one of the three supported strings. |
| `validateLinkMode` | classes/overlayClass.js:173 | Ensures mode is one of the three supported strings. |
| `validateNumeric` | ui/controls/shared/helpers.js:24 | Validate and clamp numeric input |
| `validateOpenSecondaryTabs` | ui/draw/drawNav.js:277 | closes any open saved-settings subtab whose file has gone (archived or deleted). |
| `walkFindManifestJson` | node/maintain_manifests.mjs:330 | Recursively searches a directory for manifest.json files. |
| `walkFindManifests` | node/manifestRequests.mjs:389 | every manifest.json under a folder, node_modules skipped. |
| `weldHandleDrop` | ui/figures/figureWelds.js:249 | Called when a drag of handle h of layer layerIndex ends (see the header). |
| `weldOf` | ui/figures/figureWeldModel.js:47 | The weld group point n belongs to, or null. |
| `wireDrawCommandsButton` | ui/draw/drawMenuCmds.js:472 | the Commands button opens the Draw Maintenance panel. |
| `wireEditManifestHandlers` | ui/editManifestDialog.js:185 | wireEditManifestHandlers - UPDATED (NO UseCustom BUTTON) |
| `wireFiguresCommandsButton` | ui/figures/figuresCommands.js:66 | The Commands button at the top left opens a slide-in panel ("offcanvas", a Bootstrap term) with two buttons: Rebuild & Validate  asks the Node service to reb... |
| `wireGalleryCommandsButton` | ui/gallery/galleryMenuCmds.js:335 | the Commands button opens the Gallery Maintenance panel. |
| `wireHomeCommandsButton` | ui/home/homeMenuCmds.js:208 | the Commands button opens the Home Maintenance panel. |
| `wireInstance` | ui/figures/figureLayers.js:206 | Attaches the callbacks that interactor.js and the weld code use to one layer's live object. |
| `wirePatternsCommandsButton` | ui/patterns/patternsMenuCmds.js:287 | the Commands button opens the Patterns Maintenance panel. |
| `wireUtilitiesCommandsButton` | ui/utilities/utilities.js:290 | the Commands button opens the Utilities Maintenance panel. |
| `writeChecklist` | node/homeListRequests.mjs:29 | the request (see the header above). |
| `writeFigureThumbnail` | ui/figures/figuresSave.js:159 | After a save, the picture for the category list: the figure as Show All draws it (hidden layers included), cropped and scaled to THUMB_FILE_SIZE. |
| `writeFileAtomicSync` | node/serviceFileHelpers.mjs:48 | Writes to a temporary file in the same folder, then renames it over the real file. |
| `writeGalleryPatternPng` | node/writerRequests.mjs:250 | TASK: writeGalleryPatternPng DESCRIPTION Writes TWO PNGs provided by the browser into: |
| `writeHelpFile` | node/writerRequests.mjs:168 | TASK: writeHelpFile  (CREATE OR OVERWRITE) DESCRIPTION Writes Help HTML back to disk. |
| `writeJsonFileSync` | node/serviceFileHelpers.mjs:33 | Writes formatted JSON with a trailing newline. |
| `writeJsonIfChanged` | node/maintain_manifests.mjs:354 | Alphabetizes and stringifies JSON data. |
| `writePatternFromDrawRegistry` | node/writerRequests.mjs:432 | TASK: writePatternFromDrawRegistry Payload: { |
| `writePatternThumbnail` | node/writerRequests.mjs:88 | TASK: writePatternThumbnail DESCRIPTION Writes a PNG thumbnail provided by the browser (200x200 since the category lists show pictures; any size is accepted). |
| `writeThumbnail` | node/thumbnailRequests.mjs:34 | the request (see the header above). |
| `writeToLog` | ui/errorReport.js:105 | Appends one error to today's error log. |
