export async function runFigure() {
    const objects = [
      {
        id: "bird",
        params: { size: 100, x: 200, y: 200, color: "#FFA500" }
      },
      {
        id: "boxes",
        params: { numBoxes: 5, size: 50, x: 400, y: 200, color: "#800080" }
      },
      {
        id: "cycloid",
        params: { radius: 80, numCycles: 3, x: 600, y: 300, color: "#008080" }
      }
    ];
    return objects;
  }
