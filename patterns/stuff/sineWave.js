export function runPattern() {
//	printTitle("Figure 28a");
    const amplitude = 30; // Height of the wave
    const frequency = 0.03; // How many cycles fit in the width
    const centerY = 300;

    ctx.beginPath();
    ctx.moveTo(30, centerY+18); // Start at the left edge, centered vertically

    for (let x = 30; x < 700; x++) {
		// Calculate y-coordinate using the sine function
		// Math.sin takes radians, so frequency * x adjusts the input
		const y = amplitude * Math.cos(frequency * x) + centerY;
		ctx.lineTo(x, y);
    }

    ctx.strokeStyle = 'blue'; // Color of the wave
    ctx.lineWidth = 2; // Thickness of the line
    ctx.stroke();
}

