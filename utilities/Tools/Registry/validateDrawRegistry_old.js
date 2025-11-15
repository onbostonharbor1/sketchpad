/* ------------------------------------------------------------
   validateDrawRegistry.js
   ------------------------------------------------------------
   Tools → Validation → Validate Draw Registry
   When selected, switches to Result subtab and uses
   parameterControls.js to display a dropdown listing all
   drawRegistry entries. Selecting an entry validates it and
   displays the results.
------------------------------------------------------------ */
function validateDrawRegistry() {
  console.log("🧩 validateDrawRegistry() invoked");

  const actionDiv = document.getElementById("action");
  const textDiv = document.getElementById("text");
  if (!actionDiv || !textDiv) {
    console.error("validateDrawRegistry: missing #action or #text");
    return;
  }

  // clear display areas
  textDiv.innerHTML = "";
  actionDiv.innerHTML = "";

  // --- Build dropdown control using parameterControls.js ---
  const sourceInfo = {
    parameters: { target: Object.keys(window.drawRegistry)[0] },
    controls: {
      target: {
        widget: "select",
        label: "Validate:",
        options: Object.keys(window.drawRegistry)
      }
    },
    redrawHandler: () => runDrawRegistryValidation(sourceInfo)
  };

    renderParameterControls(sourceInfo, [
	{
	    key: "target",
	    label: "Validate:",
	    widget: "select",
	    options: Object.keys(window.drawRegistry),
	    value: Object.keys(window.drawRegistry)[0]
	}
    ], "tab-tools");


  // initial run
  runDrawRegistryValidation(sourceInfo);
} // end validateDrawRegistry


/* ------------------------------------------------------------
   runDrawRegistryValidation(sourceInfo)
   Performs structural validation on selected drawRegistry entry.
------------------------------------------------------------ */
function runDrawRegistryValidation(sourceInfo) {
  const textDiv = document.getElementById("text");
  textDiv.innerHTML = "";

  const key = sourceInfo.parameters.target;
  const reg = window.drawRegistry[key];

  if (!reg) {
    textDiv.textContent = `No drawRegistry entry named "${key}"`;
    return;
  }

  // --- create results section ---
  const resultsDiv = document.createElement("div");
  resultsDiv.id = "validationResults";
  textDiv.appendChild(resultsDiv);

  const expected = [
    "name","version","category","firstOrder","source","background",
    "overlays","params","controls","create","draw"
  ];

  const lines = [];

  expected.forEach(prop => {
    if (Object.prototype.hasOwnProperty.call(reg, prop)) {
      lines.push({ msg: `✔ ${prop}: present`, ok: true });
    } else {
      lines.push({ msg: `❌ missing ${prop}`, ok: false });
    }
  });

  Object.keys(reg).forEach(k => {
    if (!expected.includes(k)) {
      lines.push({ msg: `⚠ extra member: ${k}`, ok: false });
    }
  });

  if (typeof reg.create !== "function")
    lines.push({ msg: "❌ create is not a function", ok: false });
  if (typeof reg.draw !== "function")
    lines.push({ msg: "❌ draw is not a function", ok: false });

  lines.forEach(l => {
    const p = document.createElement("div");
    p.textContent = l.msg;
    p.style.color = l.ok ? "green" : "red";
    resultsDiv.appendChild(p);
  });

  const hr = document.createElement("hr");
  hr.style.margin = "6px 0";
  resultsDiv.appendChild(hr);

  // --- pretty print registry below ---
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(reg, null, 2);
  pre.style.whiteSpace = "pre-wrap";
  textDiv.appendChild(pre);
} // end runDrawRegistryValidation

