/////////////////////////////////////////////////////////////////
// background
/////////////////////////////////////////////////////////////////
export function background (color="lightblue", grid=false) {
    let canvas = document.getElementById("sharedCanvas");
    let width          = canvas.width;
    let height         = canvas.height;
    ctx.save();
    ctx.fillStyle  = color;
    ctx.strokeStyle= "PapayaWhip";
    ctx.lineWidth  = 1;
    ctx.fillRect(0,0,width,height);

    if (grid) {
	    let steps = width/25;
	    let xPoint = 25;
	    for (let i=0; i < steps; i++) {
	      ctx.beginPath();
	      ctx.moveTo(xPoint,0);
	      ctx.lineTo(xPoint,height);
	      xPoint=xPoint+25;
	      ctx.stroke();
	      ctx.closePath();
	    }

	    steps = height/25;
	    let yPoint = 25;
	    for (let i=0; i < steps; i++) {
	      ctx.beginPath();
	      ctx.moveTo(0,yPoint);
	      ctx.lineTo(width,yPoint);
	      yPoint=yPoint+25;
	      ctx.stroke();
	      ctx.closePath();
	    }
    }
    ctx.restore();
  }

/* ============================================================
   drawSpeckledRadialGradient(width, height, opts)
   ------------------------------------------------------------
   PURPOSE
     Draw a “speckle field” whose density is LOW near the center
     and HIGH near the edges.

   KEY IDEA (inverted from your earlier version)
     - Instead of making opacity strongest at the center,
       we bias BOTH:
         (1) dot acceptance probability  (controls *how many* dots)
         (2) dot alpha                   (controls *how strong* dots)
       so that both increase toward the edges.

   PARAMETERS
     width, height : canvas dimensions (numbers)
     opts:
       dotRadius     : circle radius in pixels (default 1)
       totalDots     : how many dots to place (default 30000)
       noiseOpacity  : max alpha multiplier (0..1) (default 0.4)
       falloffPower  : controls edge emphasis (default 2)
                      Larger => even fewer center dots and more edge dots.
       centerX, centerY : gradient center (defaults: canvas center)
       color         : "r,g,b" string (default "0,0,0")

   NOTE
     This version assumes a global `ctx` (like your current code).
============================================================ */

export function drawSpeckledRadialGradient(width, height, opts) {

  if (typeof width !== "number" || typeof height !== "number") {
    throw new Error("drawSpeckledRadialGradient: width/height must be numbers");
  }

  const defaults = {
    dotRadius: 1,
    totalDots: 30000,
    noiseOpacity: 0.4,
    falloffPower: 2,
    centerX: width / 2,
    centerY: height / 2,
    color: "0,0,0"
  };

  const s = Object.assign({}, defaults, opts);

  if (typeof s.dotRadius !== "number" || s.dotRadius <= 0) {
    throw new Error("drawSpeckledRadialGradient: dotRadius must be > 0");
  }
  if (typeof s.totalDots !== "number" || s.totalDots < 0) {
    throw new Error("drawSpeckledRadialGradient: totalDots must be >= 0");
  }
  if (typeof s.noiseOpacity !== "number" || s.noiseOpacity < 0 || s.noiseOpacity > 1) {
    throw new Error("drawSpeckledRadialGradient: noiseOpacity must be 0..1");
  }
  if (typeof s.falloffPower !== "number" || s.falloffPower <= 0) {
    throw new Error("drawSpeckledRadialGradient: falloffPower must be > 0");
  }

  const cx = s.centerX;
  const cy = s.centerY;

  // Normalization radius: farthest corner distance from (cx,cy)
  const dx = Math.max(cx, width - cx);
  const dy = Math.max(cy, height - cy);
  const maxR = Math.hypot(dx, dy);

  function clamp01(v) {
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
  } // end clamp01

  // Probability and alpha both ramp UP toward edges.
  // d = 0 at center, 1 at edge (approx)
  function edgeWeight(d) {
    // pow(d, k) is small near center, large near edge
    return Math.pow(clamp01(d), s.falloffPower);
  } // end edgeWeight

  ctx.save();

  ctx.fillStyle = "rgb(" + s.color + ")";

  // We place exactly totalDots, using rejection sampling so
  // the ACCEPTANCE rate is low near center and high near edges.
  let placed = 0;
  let attempts = 0;

  // Safety cap prevents an infinite loop if settings are extreme.
  const maxAttempts = Math.max(1000, s.totalDots * 50);

  while (placed < s.totalDots && attempts < maxAttempts) {
    attempts++;

    const x = Math.random() * width;
    const y = Math.random() * height;

    const dist = Math.hypot(x - cx, y - cy);
    const d = dist / maxR; // ~0..1

    const w = edgeWeight(d);              // 0 near center, 1 near edges
    const accept = Math.random() < w;     // fewer dots at center, more at edge

    if (!accept) continue;

    // Also make dots stronger toward the edges (optional but usually helps).
    const a = s.noiseOpacity * w;

    if (a <= 0) continue;

    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(x, y, s.dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();

    placed++;
  }

  ctx.restore();

} // end drawSpeckledRadialGradient
