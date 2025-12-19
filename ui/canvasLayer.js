// ui/canvasLayer.js
function makeCanvasLayer(canvas) {
  const ctx = canvas.getContext('2d');

  return {
    ctx, // keep reference if needed
    clear(bg = '#ffffff') {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, // end clear

    begin() { ctx.beginPath(); }, // end begin
    moveTo(x, y) { ctx.moveTo(x, y); }, // end moveTo
    lineTo(x, y) { ctx.lineTo(x, y); }, // end lineTo
    stroke() { ctx.stroke(); }, // end stroke
    circle(cx, cy, r) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }, // end circle
  };
} // end makeCanvasLayer
