/////////////////////////////////////////////////////////////////
// background
/////////////////////////////////////////////////////////////////
      function background (color="lightblue", grid=false) {
	  let canvas         = document.querySelector("#StringThing");
	  let width          = canvas.width;
	  let height         = canvas.height;
	  let oldColor       = ctx.strokeStyle;
	  ctx.fillStyle  = color;
	  ctx.strokeStyle= "PapayaWhip";
	  ctx.lineWidth  = 1;
          ctx.fillRect(0,0,width,height);

	  if (grid) {
	      let steps = width/25;
	      let xPoint = 25;
	      for (let i=0; i < steps; i++) {
		  beginPath();
		  moveTo(xPoint,0);
		  lineTo(xPoint,height);
		  xPoint=xPoint+25;
		  stroke();
		  closePath();
	      }

	      steps = height/25;
	      let yPoint = 25;
	      for (let i=0; i < steps; i++) {
		  beginPath();
		  moveTo(0,yPoint);
		  lineTo(width,yPoint);
		  yPoint=yPoint+25;
		  stroke();
		  closePath();
	      }
	  }
	  ctx.strokeStyle = "black";

      } //end background




    // Create white speckles with radial density (increasing toward edges)

function makeRadialNoisePattern(context, size, totalDots,
				dotRadius, dotOpacity, falloffPower) {
    const off = document.createElement('canvas');
    off.width = off.height = size;
    const ocontext = off.getContext('2d');
    ocontext.clearRect(0, 0, size, size);

    const cx = size / 2, cy = size / 2;
    const maxDist = Math.hypot(cx, cy);
    
    for (let i = 0; i < totalDots; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const dx = x - cx, dy = y - cy;
        const distRatio = Math.hypot(dx, dy) / maxDist;
        if (Math.random() > Math.pow(distRatio, falloffPower)) continue;

        ocontext.fillStyle = `rgba(255,255,255,${dotOpacity})`; // white speckle
        ocontext.beginPath();
        ocontext.arc(x, y, dotRadius, 0, Math.PI * 2);
        ocontext.fill();
    }

    return context.createPattern(off, 'repeat');
}

function drawSpeckledRadialGradient(context, width, height, options = {}) {
    const {
        colorInner = 'darkblue',
        colorOuter = 'blue',
        innerCircle = { x: width / 2, y: height / 2, r: 0 },
        outerCircle = { x: width / 2, y: height / 2, r: Math.hypot(width, height) / 2 },
        noiseSize = 512,
        totalDots = 800,
        dotRadius = 6,
        noiseOpacity = 0.3,
        falloffPower = 3
    } = options;

    const grad = context.createRadialGradient(
        innerCircle.x, innerCircle.y, innerCircle.r,
        outerCircle.x, outerCircle.y, outerCircle.r
    );
    grad.addColorStop(0, colorInner);
    grad.addColorStop(1, colorOuter);
    context.fillStyle = grad;
    context.fillRect(0, 0, width, height);

    const noisePattern = makeRadialNoisePattern(context, noiseSize,
						totalDots, dotRadius,
						noiseOpacity, falloffPower);
    context.save();
    //      context.globalCompositeOperation = 'soft-light';
      context.fillStyle = noisePattern;
      context.fillRect(0, 0, width, height);
      context.restore();
}
