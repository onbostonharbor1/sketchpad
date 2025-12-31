import { drawRabbitPursuitCurve } from "/draw/drawPursuit.js";

export function runPattern() {
	let s = {
		rabbitStart:	{ x: 100, y: 50 },
	  	foxStart: 		{ x: 50, y: 400 },
	  	rabbitSpeed:	28,
	  	foxSpeed:		32,
	  	timeStep:		.5,
	  	maxIterations:	1000
	};
	drawRabbitPursuitCurve(s);
}
