/* drawShell_bridge.js
   ------------------------------------------------------------
   Bridge file: ensures Draw Shell initialization after DOM load.
   ------------------------------------------------------------ */

document.addEventListener("DOMContentLoaded", () => {
    console.log("Draw Shell bridge active");
    initDrawTab();  // main entry point from drawShell.js
});
