/* ===========================================================
   inchesToPixels.js – Tools script (runPattern version)
   Uses ONLY existing ctrl-field / ctrl-text / ctrl-label CSS.
   =========================================================== */
export function runPattern() {
  const params = { inches: 1 };

  // Clear action panel
  const action = document.getElementById("action");
  action.innerHTML = "";

  // Build one control row using existing classes
  const row = document.createElement("div");
  row.className = "ctrl-field";

  const label = document.createElement("label");
  label.textContent = "Inches:";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "ctrl-text";
  input.value = params.inches;

  input.addEventListener("input", () => {
    params.inches = input.value;
    display();
  });

  row.appendChild(label);
  row.appendChild(input);
  action.appendChild(row);

  // Output goes to #text (like all Tools)
  const textDiv = document.getElementById("text");
  if (!textDiv) throw new Error("inchesToPixels: #text not found");

  function display() {
    const inches = parseFloat(params.inches) || 0;
    const pixels = inches * 300;
    textDiv.innerHTML = `${inches} inch(es) = ${pixels} pixels`;
  }

  display();
  return null;
}
