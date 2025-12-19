/* ui/ui_controls.js
   -----------------------------------------------------------
   Controls breadcrumb & option buttons for each tab.
   ----------------------------------------------------------- */

function showControlPanelButtons(tabId) {
  const panel = document.getElementById(`${tabId}Control`);
  if (!panel) return;
  panel.innerHTML = "";

  const breadcrumb = document.createElement("button");
  breadcrumb.className = "btn btn-sm btn-outline-secondary w-100 mb-2 breadcrumb-btn";
  breadcrumb.textContent = "← Back to Categories";
  breadcrumb.onclick = () => handleBreadcrumb(tabId);
  panel.appendChild(breadcrumb);

  const grid = document.createElement("div");
  grid.className = "btn-grid";
  for (let i = 1; i <= 6; i++) {
    const btn = document.createElement("button");
    btn.className = "btn btn-sm btn-outline-secondary";
    btn.textContent = `Option ${i}`;
    grid.appendChild(btn);
  }
  panel.appendChild(grid);
} // end showControlPanelButtons


function handleBreadcrumb(tabId) {
  console.log("Breadcrumb clicked for:", tabId);
  // TODO: restore category display for the current tab
}
