export async function runFigure() {
    const objects = [
      {
        id: "regularPolygon",
        params: { numPoints: 5, radius: 200, centerX: 300, centerY: 300, color: "#FF0000" }
      },
      {
        id: "linkedCircles",
        params: { numCircles: 4, radius: 100, centerX: 500, centerY: 300, color: "#00FF00" }
      },
      {
        id: "nautilus",
        params: { scale: 1.5, startX: 400, startY: 400, color: "#0000FF" }
      }
    ];
    return objects;
  }
