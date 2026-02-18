/* galleryMenuCmds.js   (ui/galleryMenuCmds.js)
   ============================================================
   Gallery Menu Commands — Compatibility Facade
   ============================================================
   This file is a re-export facade. All Gallery menu command
   logic has moved into:

     ui/gallery/galleryMenuCmds.js

   Existing imports of the form:

     import { getGalleryCaptionMenuItems } from "./galleryMenuCmds.js"
     import { refreshGalleryFromManifestEdit } from "./galleryMenuCmds.js"

   continue to work without change. New code should import
   directly from the sub-module path.
   ============================================================ */

export * from "./gallery/galleryMenuCmds.js";
