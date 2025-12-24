function setPointPickerControl(field, label, def, value, info, key, tabId) {
  const readout = document.createElement("input");
  readout.type = "text";
  readout.readOnly = true;
  readout.className = "ctrl-text";
  readout.value = `${Math.round(value.x)}, ${Math.round(value.y)}`;
  readout.id = tabId + "-" + key;

  const canvas = document.getElementById("sharedCanvas");
  if (!canvas) throw new Error("pointPicker: #sharedCanvas not found");

  // This is the REAL container for dots: interaction-layer
  const container = overlayManager.canvasLayers["interaction"];
  if (!container) throw new Error("pointPicker: interaction-layer missing");

  container.style.display = "block";     // ensure visible
  container.style.pointerEvents = "auto";

  // Create the draggable dot
  const dot = document.createElement("div");
  dot.className = "point-picker-dot";
  dot.id = `dot-${key}`;
  dot.style.position = "absolute";
  dot.style.left = value.x - 5 + "px";   // canvas-local coordinates
  dot.style.top  = value.y - 5 + "px";
  dot.style.cursor = "grab";
  container.appendChild(dot);

  let isDragging = false;

  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();

    // Convert mouse to canvas-local coordinates
    const rect = canvas.getBoundingClientRect();
    const newX = e.clientX - rect.left;
    const newY = e.clientY - rect.top;

    dot.style.left = newX - 5 + "px";
    dot.style.top  = newY - 5 + "px";

    info.parameters[key].x = newX;
    info.parameters[key].y = newY;

    if (typeof info.onParamChange === "function") info.onParamChange();
    info.redrawHandler();

    readout.value = `${Math.round(newX)}, ${Math.round(newY)}`;
  };

  dot.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
    dot.style.cursor = "grabbing";
  });

  window.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      dot.style.cursor = "grab";
    }
  });

  window.addEventListener("mousemove", onMouseMove, { passive: false });

  field.appendChild(label);
  field.appendChild(readout);
} // end setPointPickerControl
