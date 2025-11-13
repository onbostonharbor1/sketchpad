/* drawRegistry_TEMPLATE.js
   ------------------------------------------------------------
   Minimal template for new drawRegistry entries.
   Based on current two-line pattern.
   ------------------------------------------------------------ */

window.drawRegistry_TEMPLATE = {
  name: "Template Figure",
  id: "templateFigure",
  version: 0.1,
  category: "prototype",
  tags: ["template"],
  description: "Simplified template for new drawRegistry entries.",

  background: null,
  overlays: [],
  transforms: [],
  elements: null,

  // --- Default parameters ---
  params: {
    pt1: { x: 200, y: 200 },
    pt2: { x: 400, y: 400 },
    midpoint: null,
    color: "#0044cc",
    lineWidth: 2
  },

  // --- UI controls ---
  controls: {
    pt1: { widget: "pointPicker", label: "Start Point:" },
    pt2: { widget: "pointPicker", label: "End Point:" },
    midpoint: { widget: "pointPicker", label: "Midpoint:" },
    color: { widget: "colorPicker", label: "Color:" },
    lineWidth: { widget: "range", min: 0.5, max: 4, step: 0.5, label: "Width:" }
  },

  // --- Initialize geometry and style ---
  init() {
    const p = this.params;
    const line = new Line(new Point(p.pt1.x, p.pt1.y), new Point(p.pt2.x, p.pt2.y));
    p.midpoint = line.midpoint();
    const style = new StringThing({ color: p.color, lineWidth: p.lineWidth });
    this.elements = { line, style };
  }, // end init

  // --- Update geometry from controls ---
  update(params) {
    const p = this.params;
    const { line, style } = this.elements;

    const incomingMid = new Point(params.midpoint.x, params.midpoint.y);
    const prevMid = line.midpoint();

    if (!incomingMid.isSame(prevMid)) {
      line.moveMidpointTo(incomingMid);
    } else {
      line.setStart(new Point(params.pt1.x, params.pt1.y));
      line.setEnd(new Point(params.pt2.x, params.pt2.y));
    }

    const mid = line.midpoint();
    p.pt1 = line.startPt();
    p.pt2 = line.endPt();
    p.midpoint = mid;

    style.color = params.color;
    style.lineWidth = Number(params.lineWidth);

    params.pt1 = line.startPt();
    params.pt2 = line.endPt();
    params.midpoint = mid;
  }, // end update

  // --- Draw on canvas ---
  draw() {
    const { line, style } = this.elements;
    drawALine(line, style.color, style.lineWidth);
  } // end draw
};
