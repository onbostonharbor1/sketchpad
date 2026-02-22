/* resultsViewController.js
   ============================================================
   Shared Categories ↔ Results View Controller
   ============================================================
   Role:
     Encapsulates the subtab bar construction, subtab activation,
     and categories ↔ results view switching that was previously
     copy-pasted across patternsNav.js, galleryNav.js,
     homeNav.js, and utilitiesNav.js.

     Each tab provides a thin RVCAdapter object that supplies
     the tab-specific details (CSS class, state accessors,
     subtab definitions). This controller owns all the shared
     DOM mechanics.

   Adapter contract (see RVCAdapter below):
     {
       cssClass:       string   — e.g. "patterns-subtabs"
       getView():      string   — current view key from uiState
       setView(v):     void     — write view key to uiState
       hasSecondary(): bool     — whether to show the secondary subtab
       tabs: [
         {
           id:      string   — data-tab-id value
           label:   string   — button text
           view:    string   — view key this tab represents
           onClick: async fn — what to do when clicked
         },
         ...
       ]
     }

   Gallery note:
     Gallery has a two-level hierarchy (domain subtabs sit above
     the categories ↔ results pattern). galleryNav.js uses this
     controller only for the shared mechanics (buildSubtabBar,
     activateSubtab, buildSubtabButton) and manages the domain
     layer itself.

   Exports:
     buildSubtabBar(adapter)        — build full subtab bar
     activateSubtab(cssClass, id)   — highlight one button
     buildSubtabButton(id, label, onClick) — create one <li>
   ============================================================ */


/* ============================================================
   buildSubtabBar(adapter)
   ============================================================
   Builds the subtab bar inside #subtabs from the adapter's
   tab definitions.

   Only tabs whose condition passes are included:
     • A tab with no condition is always included.
     • A tab with condition: () => bool is included only when
       condition() returns true.

   After building, activates the tab whose view matches
   adapter.getView().

   Arguments:
     adapter — RVCAdapter object (see module header)
   ============================================================ */
export function buildSubtabBar(adapter) {

  const container = document.getElementById("subtabs");
  if (!container) throw new Error("buildSubtabBar: #subtabs not found");

  container.innerHTML = "";

  const bar = document.createElement("ul");
  bar.className = "nav nav-tabs " + adapter.cssClass;
  container.appendChild(bar);

  for (const tab of adapter.tabs) {
    /* Skip conditional tabs whose condition is not met. */
    if (tab.condition && !tab.condition()) continue;

    bar.appendChild(buildSubtabButton(tab.id, tab.label, tab.onClick));
  }

  /* Activate whichever view is currently active. */
  activateSubtab(adapter.cssClass, adapter.getActiveId());

} // end buildSubtabBar


/* ============================================================
   activateSubtab(cssClass, activeId)
   ============================================================
   Applies "active" CSS class to the button matching activeId
   and removes it from all others within the subtab bar.

   Arguments:
     cssClass — the ul's CSS class (e.g. "patterns-subtabs")
     activeId — data-tab-id of the button to activate
   ============================================================ */
export function activateSubtab(cssClass, activeId) {

  const bar = document.querySelector(`#subtabs ul.${cssClass}`);
  if (!bar) return; /* Silently skip if bar not yet rendered. */

  bar.querySelectorAll(".nav-link").forEach((btn) => {
    if (btn.dataset.tabId === activeId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

} // end activateSubtab


/* ============================================================
   buildSubtabButton(id, label, onClick)
   ============================================================
   Creates a single <li><button> subtab element.

   Arguments:
     id      — data-tab-id value
     label   — visible button text
     onClick — async click handler

   Returns:
     <li> element ready to append to the subtab <ul>
   ============================================================ */
export function buildSubtabButton(id, label, onClick) {

  const li = document.createElement("li");
  li.className = "nav-item";

  const btn = document.createElement("button");
  btn.className     = "nav-link";
  btn.dataset.tabId = id;
  btn.textContent   = label;

  btn.addEventListener("click", () => {
    Promise.resolve(onClick()).catch((err) => { throw err; });
  });

  li.appendChild(btn);
  return li;

} // end buildSubtabButton
