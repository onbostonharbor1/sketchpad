import { Line, Point, StringThing } from "../../classes/classes.js";
import { printTitle } from "../../draw/draw_utilities.js";
import { drawRegularPolygonTouch } from "../../draw/drawRegular.js";

export function runPattern() {
  printTitle("Draw Regular Polygon Touch");

  let s = {
    numSteps: 20,
    midpoint: new Point(150, 150),
    radius: 100,
    color: "green",
    numNodes: 4
  };

  let thing = new StringThing(s);
  drawRegularPolygonTouch(thing);

  thing.color = "blue";
  thing.midpoint = new Point(400, 150);
  thing.numNodes = 5;
  drawRegularPolygonTouch(thing);

  thing.color = "red";
  thing.midpoint = new Point(150, 400);
  thing.numNodes = 6;
  drawRegularPolygonTouch(thing);

  thing.color = "violet";
  thing.midpoint = new Point(400, 400);
  thing.numNodes = 8;
  drawRegularPolygonTouch(thing);
} // end runPattern
