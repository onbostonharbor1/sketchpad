// magic.js
// This file runs automatically if present, bypassing the UI.
// It instantiates and draws registry objects directly for testing.

function drawRegistryTest() {
    printTitle("Draw Registry Test");
  clearCanvas();

  // --- Test Regular Polygon ---
  let poly = drawRegistry.regularPolygon.create();
  drawRegistry.regularPolygon.draw(poly);

  // Custom Regular Polygon
  let poly2 = drawRegistry.regularPolygon.create({
    midpoint: new Point(400, 200),
    numNodes: 8,
    color: "blue",
    rotate: 30
  });
  drawRegistry.regularPolygon.draw(poly2);

  // --- Test Inverse Star ---
  let star = drawRegistry.inverseStar.create();
  drawRegistry.inverseStar.draw(star);

  let star2 = drawRegistry.inverseStar.create({
    midpoint: new Point(200, 400),
    numNodes: 7,
    color: "green"
  });
  drawRegistry.inverseStar.draw(star2);
}

// Run immediately when magic.js loads
drawRegistryTest();
