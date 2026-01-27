/* ============================================================
   Pursuit Curves (Static)

   SOURCE
   ------
   Direct conversion from standalone HTML demo.
   No controls, no interaction, no UI coupling.

   DESCRIPTION
   -----------
   Multiple pursuit polygons drawn from different initial
   configurations, including reversed orientation.

   ASSUMPTIONS (FAIL-FAST)
   -----------------------
   - window.ctx exists
   ============================================================ */


const steps  = 1000;   // number of iterations
const dt     = 0.1;    // step size
const radius = 200;    // initial circle radius
const speed  = 0.5;    // pursuit rate scaling


/* ------------------------------------------------------------
   setPoints(numNodes, x, y, rotation)
------------------------------------------------------------ */
function setPoints(numNodes, x, y, rotation = 0) {

  const pts = [];

  for (let k = 0; k < numNodes; k++) {
    let theta = 2 * Math.PI * k / numNodes;
    theta = theta - rotation;

    pts.push({
      x: x + radius * Math.cos(theta),
      y: y + radius * Math.sin(theta)
    });
  }

  return pts;

} // end setPoints


/* ------------------------------------------------------------
   drawPursuit(pts)
------------------------------------------------------------ */
function drawPursuit(pts) {

  const n = pts.length;

  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth   = 1;

  ctx.beginPath();

  for (let s = 0; s < steps; s++) {

    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < n; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.lineTo(pts[0].x, pts[0].y);

    const newPts = [];

    for (let i = 0; i < n; i++) {
      const j  = (i + 1) % n;
      const dx = pts[j].x - pts[i].x;
      const dy = pts[j].y - pts[i].y;

      newPts.push({
        x: pts[i].x + speed * dx * dt,
        y: pts[i].y + speed * dy * dt
      });
    }

    pts = newPts;
  }

  ctx.stroke();

} // end drawPursuit


/* ------------------------------------------------------------
   runPattern() — Gallery entry point
------------------------------------------------------------ */
export function runPattern() {

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.restore();

  let pts;

  pts = setPoints(4, 200, 200, Math.PI / 4);
  drawPursuit(pts);

  pts = setPoints(4, 483, 483, Math.PI / 4);
  drawPursuit(pts);

  pts = setPoints(4, 483, 200, Math.PI / 4);
  pts.reverse();
  drawPursuit(pts);

  pts = setPoints(4, 200, 483, Math.PI / 4);
  pts.reverse();
  drawPursuit(pts);

} // end runPattern
