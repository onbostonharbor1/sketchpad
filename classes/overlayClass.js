////////////////////////////////////////////////////////////////
// overlay.js
// ------------------------------------------------------------
// Overlay class: handles global modal overlay panel
////////////////////////////////////////////////////////////////

export class Overlay {
  constructor() {
    this.container = document.getElementById("overlayContainer");
    this.bg = document.getElementById("overlayBackground");
    this.panel = document.getElementById("overlayPanel");
    this.header = document.getElementById("overlayHeader");
    this.titleNode = document.getElementById("overlayTitle");
    this.closeBtn = document.getElementById("overlayClose");
    this.content = document.getElementById("overlayContent");

    if (
      !this.container ||
      !this.bg ||
      !this.panel ||
      !this.header ||
      !this.titleNode ||
      !this.closeBtn ||
      !this.content
    ) {
      throw new Error("Overlay DOM missing");
    }

    this.attachHandlers();
  } // end constructor

  attachHandlers() {
    this.bg.onclick = () => this.hide();
    this.closeBtn.onclick = () => this.hide();
  } // end attachHandlers

  show(title, html) {
    this.titleNode.textContent = title;
    this.content.innerHTML = html;
    this.container.style.display = "block";

    uiState.overlay.active = true;
    uiState.overlay.title = title;
  } // end show

  hide() {
    this.content.innerHTML = "";
    this.container.style.display = "none";

    uiState.overlay.active = false;
    uiState.overlay.title = "";
  } // end hide

  setTitle(title) {
    this.titleNode.textContent = title;
    uiState.overlay.title = title;
  } // end setTitle

  setContent(html) {
    this.content.innerHTML = html;
  } // end setContent
}
