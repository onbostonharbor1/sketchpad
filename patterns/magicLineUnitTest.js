// 🗂️ Test registry: each entry defines a method test
const unitTests = [
    {
	name: "bendAtMidpoint",
	options: ["bend","midpoint"],
	before: () => new Line(new Point(100, 100), new Point(200, 100)),
	after: line => line.bendAtMidpoint(Math.PI / 4)
    },
    {
	name: "perpendicularAtMidpoint",
	options: ["midpoint"],
	before: () => new Line(new Point(100, 100), new Point(200, 100)),
	after: line => line.perpendicularAtMidpoint(80)
    },
    {
	name: "reversed (text only)",
	options: [],
	render: () => {
	    const line = new Line(new Point(100, 100), new Point(200, 150));
	    ctx.fillStyle = "black";
	    ctx.font = "14px sans-serif";
	    ctx.fillText(`Original start: (${line.start.x}, ${line.start.y})`, 20, 30);
	    ctx.fillText(`Original end:   (${line.end.x}, ${line.end.y})`, 20, 50);

	    const reversed = line.reversed();
	    ctx.fillStyle = "blue";
	    ctx.fillText(`Reversed start: (${reversed.start.x}, ${reversed.start.y})`, 20, 80);
	    ctx.fillText(`Reversed end:   (${reversed.end.x}, ${reversed.end.y})`, 20, 100);
	}
    },
//    {
//         name: "reversed",
//         options: [],
//         before: () => {
//           const line = new Line(new Point(100, 100), new Point(200, 150));
//           DrawLine(line);
//           drawStartDot(line);
//           return line;
//         },
//         after: line => {
//           const reversed = line.reversed();
//           DrawLine(reversed);
//           drawStartDot(reversed);
//           return reversed;
//         }
//    },
    {
	name: "rotateAtStart",
	options: ["rotation"],
	before: () => new Line(new Point(100, 100), new Point(200, 100)),
	after: line => line.rotateAtStart(Math.PI / 4)
    },
    {
	name: "shortenEnd",
	options: [],
	before: () => new Line(new Point(100, 100), new Point(200, 100)),
	after: line => line.shortenEnd(50)
    },
    {
	name: "shortenStart",
	options: [],
	before: () => new Line(new Point(100, 100), new Point(200, 100)),
	after: line => line.shortenStart(50)
    }
];

// 🔁 State
let currentIndex = 0;
let showingAfter = false;
let beforeImageData = null;

// 🧼 Clear canvas
function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawStartDot(line, color = 'red') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(line.start.x, line.start.y, 4, 0, 2*Math.PI);
  ctx.fill();
}

// 🟡 Draw midpoint dot
function drawMidpointDot(line, color = 'red') {
  const mid = line.midpoint();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(mid.x, mid.y, 4, 0, 2 * Math.PI);
  ctx.fill();
}

// 🧭 Draw angle arc
function drawAngleArc(center, startPt, angle, radius = 30, color = 'orange') {
  const startAngle = Math.atan2(startPt.y - center.y, startPt.x - center.x);
  const endAngle = startAngle + angle;

  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, startAngle, endAngle);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = '12px sans-serif';
  const labelX = center.x + radius * Math.cos((startAngle + endAngle) / 2);
  const labelY = center.y + radius * Math.sin((startAngle + endAngle) / 2);
  ctx.fillText(`${(angle * 180 / Math.PI).toFixed(1)}°`, labelX, labelY);
}

  function DrawLine(line, color = 'black', label = null) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(line.start.x, line.start.y);
    ctx.lineTo(line.end.x, line.end.y);
    ctx.stroke();

    if (label) {
      ctx.fillStyle = color;
      ctx.font = '14px sans-serif';
      ctx.fillText(label, line.start.x + 5, line.start.y - 5);
    }
  }


function unitRender(unitTests) {
  clearCanvas();

  const test = unitTests[currentIndex];
  const title = document.getElementById('testTitle');
  if (typeof test.render === "function") {
    test.render();
    title.textContent = `${test.name}`;
    return;
  }
  const baseLine = test.before();

    function drawOverlays(result, baseLine) {
	if (Array.isArray(result)) {
	    result.forEach((line, i) => {
		DrawLine(line, 'blue', `after ${i + 1}`);
		if (test.options.includes("midpoint")) {
		    drawMidpointDot(line);
		}
	    });
	} else {
	    DrawLine(result, 'blue');
	    if (test.options.includes("midpoint")) {
		drawMidpointDot(result);
	    }
	    if (test.options.includes("rotation")) {
		drawAngleArc(result.start, baseLine.end, Math.PI / 4);
	    }
	    if (test.options.includes("bend")) {
		drawAngleArc(result[0].start, result[0].end, -Math.PI / 8);
		drawAngleArc(result[1].start, result[1].end, Math.PI / 8);
	    }
	}
    }

    DrawLine(baseLine, 'gray');
    if (test.options.includes("midpoint")) {
	drawMidpointDot(baseLine);
    }

  if (showingAfter) {
    const result = test.after(baseLine);
    drawOverlays(result, baseLine);
    title.textContent = `${test.name}: after`;
  } else {
    title.textContent = `${test.name}: before`;
  }
}


canvas.addEventListener('click', e => {
  const clickX = e.offsetX;
  const midpoint = canvas.width / 2;
  const test = unitTests[currentIndex];

  if (typeof test.render === "function") {
    // Always go forward for render-only tests
    currentIndex = (currentIndex + 1) % unitTests.length;
    showingAfter = false;
  } else if (clickX > midpoint) {
    // Right half: go forward
    if (showingAfter) {
      currentIndex = (currentIndex + 1) % unitTests.length;
    }
    showingAfter = !showingAfter;
  } else {
    // Left half: go backward
    if (showingAfter) {
      currentIndex = (currentIndex - 1 + unitTests.length) % unitTests.length;
    }
    showingAfter = !showingAfter;
  }

  unitRender(unitTests);
});

//canvas.addEventListener('click', e => {
//    const clickX = e.offsetX;
//    const midpoint = canvas.width / 2;
//
//    if (clickX > midpoint) {
//	// Right half: toggle state
//	if (showingAfter) {
//	    currentIndex = (currentIndex + 1) % unitTests.length;
//	} 
//
//    } else {
//	// Left half: toggle state
//	if (showingAfter) {
//	    currentIndex = (currentIndex - 1 + unitTests.length) % unitTests.length;
//	}
//    }
//    showingAfter = !showingAfter;
//
//  unitRender(unitTests);
//});

// 🧩 Setup title display
const titleDiv = document.createElement('div');
titleDiv.id = 'testTitle';
titleDiv.style.position = 'absolute';
titleDiv.style.top = '10px';
titleDiv.style.left = '10px';
titleDiv.style.font = '16px sans-serif';
titleDiv.style.fontWeight = 'bold';
document.getElementById('viewer').style.position = 'relative';
document.getElementById('viewer').appendChild(titleDiv);
//document.getElementById('viewer').style.background = 'rgba(0,0,255,0.1)';

//document.body.appendChild(titleDiv);

// 🚀 Initial render
unitRender(unitTests);

