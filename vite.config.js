/* vite.config.js
   ============================================================
   Vite settings for Sketchpad: one thing only, passing the page's
   requests for the Node service through Vite.
   ============================================================
   The page sends every Node service request to "/dispatch" on its own
   server (ui/nodeLayer.js). Vite passes it on to the Node service on
   port 5174. So the page never needs to know where the service is, and
   it works the same on the PC, in a GitHub Codespace opened from the
   iPad, or anywhere else the page is reached through Vite.

   The Node service only answers pages it recognises (its origin check,
   node/sketchpadServer.mjs). A request that came from Sketchpad's own
   page, whatever address that page was reached at, is passed on as
   coming from http://localhost:5173. A request from any other site keeps
   its own origin, and the service refuses it as before.

   allowedHosts lets the page be reached through a Codespace's forwarded
   address (https://<name>-5173.app.github.dev).
   ============================================================ */

const SERVICE = "http://127.0.0.1:" + (process.env.SKETCHPAD_PORT || 5174);

export default {
  server: {
    allowedHosts: [".app.github.dev"],
    proxy: {
      "/dispatch": {
        target: SERVICE,
        changeOrigin: true,               // Host header becomes the service's own address
        configure(proxy) {
          proxy.on("proxyReq", (proxyReq, req) => {
            const origin = req.headers.origin;
            if (!origin) return;
            // Same page: the origin names the same host the browser asked Vite for.
            let sameHost = false;
            try { sameHost = new URL(origin).host === req.headers.host; } catch (e) { sameHost = false; }
            if (sameHost) proxyReq.setHeader("origin", "http://localhost:5173");
          });
        }
      }
    }
  }
};
