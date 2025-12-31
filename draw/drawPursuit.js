import { Point } from '/classes/classes.js';
import { drawLine } from '/draw/draw_utilities.js';

//////////////////////////////////////////////////////////////////
// drawRabbitPursuitCurve
//////////////////////////////////////////////////////////////////
export function drawRabbitPursuitCurve(thing) {
	  let rabbitStart = thing.rabbitStart;
	  let foxStart    = thing.foxStart;
	  let rabbitSpeed = thing.rabbitSpeed;
	  let foxSpeed    = thing.foxSpeed;
	  let timeStep    = thing.timeStep;
	  let maxIterations = thing.maxIterations;
	  let rabbitPos  = rabbitStart;
	  let foxPos     = foxStart;
	  let rabbitPath = [rabbitPos];
	  let foxPath    = [foxPos]; // Store the fox's path
	  for (let i = 0; i < maxIterations; i++) {
	      // Move the rabbit
	      rabbitPos = { x: rabbitPos.x + rabbitSpeed * timeStep,
			    		y: rabbitPos.y };
	      rabbitPath.push(rabbitPos);
	      		// Calculate direction from fox to rabbit
	      let direction = { x: rabbitPos.x - foxPos.x,
							y: rabbitPos.y - foxPos.y };
	      let magnitude = Math.sqrt(direction.x * direction.x
							+ direction.y * direction.y);
	      let unitDirection = { x: direction.x / magnitude,
				    			y: direction.y / magnitude };
	      // Move the fox
	      foxPos = { x: foxPos.x + unitDirection.x * foxSpeed * timeStep,
			 		y: foxPos.y + unitDirection.y * foxSpeed * timeStep };
	      foxPath.push(foxPos);
	      if (magnitude < 180) break; // Stop if the fox is close enough
	  }

	  for (let i=0; i < rabbitPath.length; i++) {
        let start = new Point(foxPath[i].x,   foxPath[i].y);
        let end   = new Point(rabbitPath[i].x,rabbitPath[i].y);
	    drawLine(start,end,"blue");
	  }
      }
// end drawPursuitCurve
