function injectOverlayIfNeeded() {
    if (document.getElementById('overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'overlay';

    // Title section
    const titleDiv = document.createElement('div');
    titleDiv.id = 'overlayTitle';
    overlay.appendChild(titleDiv);

    // Controls section
    const controls = document.createElement('div');
    controls.id = 'overlayControls';

['Prev', 'Next'].forEach(label => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.onclick = () => {
        if (label === 'Prev') handlePrev();
        else if (label === 'Next') handleNext();
    };
    controls.appendChild(btn);
});

// Only add Save button in Patterns mode
if (gl.currentMode === 'patterns') {
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.onclick = handleSave;
    controls.appendChild(saveBtn);
}
    
    overlay.appendChild(controls);

    const viewer = document.getElementById('viewer');
    viewer.style.position = 'relative';
    viewer.appendChild(overlay);

    // Initialize with current title
    setTitle(gl.currentTitle || "Untitled");
}

function refreshOverlayTitle() {
    const titleEl = document.getElementById('overlayTitle');
    if (!titleEl) return;

    const filename = gl.currentFilename || "untitled";
    const text = gl.currentTitle || "";
    titleEl.textContent = text ? `${filename}: ${text}` : filename;
}


function setTitle(text = "No Title") {
    gl.currentTitle = `${gl.currentFilename}: ${text}`;

    // Update overlay if present
    const titleEl = document.getElementById('overlayTitle');
    if (titleEl) {
        titleEl.textContent = gl.currentTitle;
    }
}


function handleNext() {
    const wrappers = Array.from(itemFieldset.querySelectorAll('.thumbWrapper'));
    if (wrappers.length === 0) {
        console.warn('handleNext: no thumbnails found');
        return;
    }

    const currentIndex = wrappers.findIndex(w => w.classList.contains('selected'));
    const nextIndex = (currentIndex + 1) % wrappers.length;

    wrappers.forEach(w => w.classList.remove('selected'));
    const nextWrapper = wrappers[nextIndex];
    nextWrapper.classList.add('selected');
    nextWrapper.click();

    gl.currentTitle = ""; // reset
    refreshOverlayTitle();
}

function handlePrev() {
    const wrappers = Array.from(itemFieldset.querySelectorAll('.thumbWrapper'));
    if (wrappers.length === 0) {
        console.warn('handlePrev: no thumbnails found');
        return;
    }

    const currentIndex = wrappers.findIndex(w => w.classList.contains('selected'));
    const prevIndex = (currentIndex > 0) ? currentIndex - 1 : wrappers.length - 1;

    wrappers.forEach(w => w.classList.remove('selected'));
    const prevWrapper = wrappers[prevIndex];
    prevWrapper.classList.add('selected');
    prevWrapper.click();

    gl.currentTitle = ""; // reset
    refreshOverlayTitle();
}


function handleSave() {
    const snapshotCanvas = document.createElement('canvas');
    snapshotCanvas.width = canvas.width;
    snapshotCanvas.height = canvas.height;
    const snapshotCtx = snapshotCanvas.getContext('2d');
    
    snapshotCtx.fillStyle = '#ffffff';
    snapshotCtx.fillRect(0, 0, snapshotCanvas.width,
			 snapshotCanvas.height);
    snapshotCtx.drawImage(canvas, 0, 0);
    
    const bounds = getDrawnBoundsFrom(snapshotCtx,
				      snapshotCanvas, '#ffffff');
    if (!bounds) {
	console.warn('handleSave: canvas appears blank');
	return;
    }

    const { minX, minY, maxX, maxY } = bounds;
    const croppedWidth = maxX - minX + 1;
    const croppedHeight = maxY - minY + 1;

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = croppedWidth;
    croppedCanvas.height = croppedHeight;
    const croppedCtx = croppedCanvas.getContext('2d');
    croppedCtx.drawImage(snapshotCanvas, minX, minY, croppedWidth,
			 croppedHeight, 0, 0, croppedWidth, croppedHeight);

  // Optional title overlay
  if (gl.currentTitle) {
    croppedCtx.font = '16px sans-serif';
    croppedCtx.fillStyle = 'black';
    croppedCtx.textBaseline = 'top';
    croppedCtx.fillText(gl.currentTitle, 10, 10);
  }

    // Thumbnail generation (36px wide)
    const thumbCanvas = document.createElement('canvas');
    const thumbWidth = 36;
    const scale = thumbWidth / croppedWidth;
    thumbCanvas.width = thumbWidth;
    thumbCanvas.height = Math.round(croppedHeight * scale);
    const thumbCtx = thumbCanvas.getContext('2d');
    thumbCtx.drawImage(croppedCanvas, 0, 0,
		       thumbCanvas.width, thumbCanvas.height);

    const filename = gl.currentFilename || 'untitled';
    downloadCanvas(croppedCanvas, `${filename}.png`);
    downloadCanvas(thumbCanvas, `thumb_${filename}.png`);
}

function downloadCanvas(canvas, filename) {
    canvas.toBlob(blob => {
	const link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
    }, 'image/png');
}

function getDrawnBoundsFrom(ctx, canvas, bg = '#ffffff',
			    tolerance = 8) {
    const imageData = ctx.getImageData(0, 0,
		           canvas.width, canvas.height);
    const { data, width, height } = imageData;
    const bgRGB = hexToRGB(bg);

    let minX = width, minY = height, maxX = 0, maxY = 0;
    
    for (let y = 0; y < height; y++) {
	for (let x = 0; x < width; x++) {
	    const i = (y * width + x) * 4;
	    const r = data[i], g = data[i + 1],
		  b = data[i + 2], a = data[i + 3];

	    const isBackground =
		  Math.abs(r - bgRGB.r) < tolerance &&
		  Math.abs(g - bgRGB.g) < tolerance &&
		  Math.abs(b - bgRGB.b) < tolerance &&
		  a > 200;

	    if (!isBackground) {
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (x > maxX) maxX = x;
		if (y > maxY) maxY = y;
	    }
	}
    }

    if (minX > maxX || minY > maxY) return null;
    return { minX, minY, maxX, maxY };
}

function hexToRGB(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

