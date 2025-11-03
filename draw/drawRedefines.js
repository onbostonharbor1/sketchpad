//////////////////////////////////////////////////////////////////
// Replace: moveTo, lineTo, beginPath, closePath, stroke
//////////////////////////////////////////////////////////////////
function beginPath() {
    if (!drawState.dot) ctx.beginPath();
}

function arc(x,y,radius,startAngle, endAngle,counterclockwise=false) {
    ctx.arc(x,y,radius,startAngle,endAngle,counterclockwise);
}

function closePath() {
    if (!drawState.dot) ctx.closePath();
}

function fill() {
    ctx.fill();
}

function fillText(text,x,y) {
    ctx.fillText(text,x,y);
}

function  fillRect(x,y,width,height) {
    ctx.fillRect(x,y,width,height);
}

function lineTo(pt1,pt2) {
    if (drawState.dot) {
	drawCircle(new Point(pt1,pt2),1);
    } else {
	ctx.lineTo(pt1,pt2)
    }
}

function moveTo(pt1,pt2) {
    if (drawState.dot) {
	drawCircle(new Point(pt1,pt2),1);
    } else {
	ctx.moveTo(pt1,pt2)
    }
}

function restore() {
    ctx.restore();
}

function save(){
    ctx.save();
}
    
function stroke(){
    if (!drawState.dot) ctx.stroke();
}



