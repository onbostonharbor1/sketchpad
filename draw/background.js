/////////////////////////////////////////////////////////////////
// background
/////////////////////////////////////////////////////////////////
function background (color="lightblue", grid=false) {
    let canvas = document.getElementById("sharedCanvas");
    let width          = canvas.width;
    let height         = canvas.height;
    save();
    let oldColor       = ctx.strokeStyle;
    ctx.fillStyle  = color;
    ctx.strokeStyle= "PapayaWhip";
    ctx.lineWidth  = 1;
    fillRect(0,0,width,height);

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
    ctx.restore();
    
} //end background

