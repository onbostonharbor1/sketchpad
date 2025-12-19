/* ui/ui_tabs.js
   ------------------------------------------------------------
   Handles main tab switching (Draw, Patterns, Figures, Gallery, Utilities)
   and subtab logic for Gallery and Utilities.
   Integrates CanvasManager to maintain a shared canvas instance.
   ------------------------------------------------------------ */

document.addEventListener("DOMContentLoaded", () => {
  const mainTabs = document.querySelectorAll("#mainTabs .nav-link");

  mainTabs.forEach((tab) => {
    tab.addEventListener("shown.bs.tab", (e) => {
      const activeId = e.target.getAttribute("data-bs-target").substring(1);
      handleMainTabChange(activeId);
    });
  });

  // Initialize with the default active tab
  const activeTab = document.querySelector("#mainTabs .nav-link.active");
  if (activeTab) handleMainTabChange(activeTab.dataset.bsTarget.replace("#", ""));
});

/* ------------------------------------------------------------
   Handle main tab change
------------------------------------------------------------ */
function handleMainTabChange(tabId) {
  console.log("Switched to tab:", tabId);

  // 🟦 Ignore reselection of the same tab
  if (uiState.currentTab === tabId) {
    console.log("Reselected same tab; no changes.");
    return;
  }

  // 🟪 Save previous tab state (canvas, controls, etc.)
  if (uiState.currentTab) CanvasManager.save(gl.currentTab);
  uiState.currentTab = tabId;

  // 🧹 Clear all left control areas when switching
  document.querySelectorAll("aside[id$='Control']").forEach((aside) => {
    aside.innerHTML = ""; // empty but keeps structure
  });

  // 🧩 Initialize tab-specific behavior
  switch (tabId) {
    case "draw":
      CanvasManager.ensureCanvas("drawMain");
      initDrawTab();
      break;

    case "patterns":
      CanvasManager.ensureCanvas("patternsMain");
      initPatternsTab?.();
      break;

    case "gallery":
      CanvasManager.ensureCanvas("galleryMain");
      initGalleryTab?.();
      break;

    case "utilities":
      CanvasManager.ensureCanvas("utilitiesMain");
      initUtilitiesTab?.();
      break;

    default:
      console.warn(`Unhandled tab: ${tabId}`);
  }
}  // end handleMainTabChange


/* ------------------------------------------------------------
   GALLERY SUBTABS
------------------------------------------------------------ */
function setupGallerySubtabs() {
  const subtabs = document.querySelectorAll(".gallery-subtabs .subtab");
  const panes = document.querySelectorAll(".gallery-subtab-pane");

  subtabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      subtabs.forEach((t) => t.classList.remove("active"));
      panes.forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.target;
      document.getElementById(`gallery-${target}`).classList.add("active");
    });
  });
}

/* ------------------------------------------------------------
   UTILITIES SUBTABS
------------------------------------------------------------ */
function setupUtilitiesSubtabs() {
  const subtabs = document.querySelectorAll(".utilities-subtabs .subtab");
  const panes = document.querySelectorAll(".utilities-subtab-pane");

  subtabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      subtabs.forEach((t) => t.classList.remove("active"));
      panes.forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.target;
      document.getElementById(`utilities-${target}`).classList.add("active");
    });
  });
}
