/* ===========================================================
   validateDrawRegistry.js  – Tools script (runPattern version)
   -----------------------------------------------------------
   Displays a dropdown listing all drawRegistry entries.
   Selecting an entry validates it and prints the results into #text.
=========================================================== */

export function runPattern() {
  const actionDiv = document.getElementById("action");
  const textDiv = document.getElementById("text");

  if (!actionDiv || !textDiv) {
    console.error("validateDrawRegistry: missing #action or #text");
    return;
  }

  // clear output panels
  actionDiv.innerHTML = "";
  textDiv.innerHTML = "";

  // ---------------------------------------------------------
  // Build dropdown using ONLY existing ctrl-field CSS
  // ---------------------------------------------------------
  const keys = Object.keys(window.drawRegistry);
  const params = { target: keys[0] };

  const row = document.createElement("div");
  row.className = "ctrl-field";

  const label = document.createElement("label");
  label.textContent = "Validate:";

  const select = document.createElement("select");

  keys.forEach(k => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    select.appendChild(opt);
  });

  select.value = params.target;

  select.addEventListener("input", () => {
    params.target = select.value;
    validate(params.target, textDiv);
  });

  row.appendChild(label);
  row.appendChild(select);
  actionDiv.appendChild(row);

  // ---------------------------------------------------------
  // Initial validation
  // ---------------------------------------------------------
  validate(params.target, textDiv);

  return null;
} // end runPattern


/* ===========================================================
   validate(target, textDiv)
   Core validation logic moved into its own helper function.
=========================================================== */
function validate(key, textDiv) {
  textDiv.innerHTML = "";

  const reg = window.drawRegistry[key];
  if (!reg) {
    textDiv.textContent = `No drawRegistry entry named "${key}"`;
    return;
  }

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

  // Append results
  lines.forEach(l => {
    const p = document.createElement("div");
    p.textContent = l.msg;
    p.style.color = l.ok ? "green" : "red";
    resultsDiv.appendChild(p);
  });

  resultsDiv.appendChild(document.createElement("hr"));

  // Pretty-print registry object
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(reg, null, 2);
  pre.style.whiteSpace = "pre-wrap";
  textDiv.appendChild(pre);
} // end validate
