import { printText }   from "/draw/draw_utilities.js";
import { Point }       from "/classes/classes.js";

export class Parametric {

	constructor(s = {}) {

		const defaults = {
			scale:     60,
			midX:      200,
			midY:      200,
			funcX:     null,
			funcY:     null,
			pts:       [],
			color:     "blue",
			lineWidth: 1
		};

		Object.assign(this, defaults, s);

		if (!this.funcX || !this.funcY) {
			throw new Error("Parametric requires funcX and funcY");
		}

	} // end constructor


	getFuncBody(fn) {

		const src = fn.toString();

		// Extract "return ..." for classic function bodies
		const m = src.match(/return\s+([\s\S]*?);?\s*\}/);
		if (m && m[1]) return m[1].trim();

		// Fallback: return full source if parsing fails
		return src;

	} // end getFuncBody


	printEquations() {

		const xExpr = this.getFuncBody(this.funcX);
		const yExpr = this.getFuncBody(this.funcY);

		printText("funcX: " + xExpr, new Point(10, 10));
		printText("funcY: " + yExpr, new Point(10, 25));

	} // end printEquations

} // end class Parametric

