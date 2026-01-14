import { getLineEquation, printText } from "/draw/draw_utilities.js";
import { Point } from "/classes/classes.js";


export function runPattern() {

  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("runPattern: missing #text");

  textDiv.innerHTML = "";

  const point1 = new Point(1, 6);
  const point2 = new Point(3, 2);

  const equation = getLineEquation(point1, point2);

  textDiv.textContent = "Get equation of a line: " + equation;

  // IMPORTANT:
  // Return null so Utilities does NOT overwrite #text
  return null;

} // end runPattern


