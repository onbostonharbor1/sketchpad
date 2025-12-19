/* ===========================================================
   sketchpadServer.js  (Node.js)
   -----------------------------------------------------------
   PURPOSE
   -------
   Thin HTTP server wrapper for Sketchpad background services.

   This server exposes ONE endpoint:

     POST /dispatch

   It receives:
     {
       "requestName": "<string>",
       "payload": { ... }
     }

   It calls:
     dispatchService(requestName, payload)

   It returns:
     JSON result object produced by the service task.

   -----------------------------------------------------------
   DIRECTORY / PLACEMENT

   Place this file in:
     ./node/sketchpadServer.js

   It imports the task dispatcher from:
     ./node/sketchpadService.js

   -----------------------------------------------------------
   FAIL-FAST POLICY

   - Invalid requestName → 400
   - Unknown requestName → 400 (propagated error message)
   - Task exceptions      → 500

   -----------------------------------------------------------
   NOTES

   - No Express required.
   - Uses Node’s built-in http module for minimal dependencies.
   - Designed to be launched alongside Vite.

   =========================================================== */

import http from "http";
import { dispatchService } from "./sketchpadService.mjs";

/* ===========================================================
   CONFIGURATION CONSTANTS

   DESCRIPTION
   -----------
   Server listens only on localhost.
   Pick a port that will not collide with Vite (5173).

   If you change PORT here, you must also change the URL in:
     ui/nodeLayer.js

   =========================================================== */

const HOST = "127.0.0.1";
const PORT = 5174;

/* ===========================================================
   startServer()

   DESCRIPTION
   -----------
   Creates and starts the HTTP server.
   The server routes:
     - POST /dispatch
     - everything else: 404

   =========================================================== */

export function startServer() {
  const server = http.createServer(handleRequest);

  server.listen(PORT, HOST, () => {
    console.log(`Sketchpad service listening at http://${HOST}:${PORT}`);
  });

  // Provide a predictable shutdown path (Ctrl+C, parent kill, etc.)
  // Note: When started under concurrently with -k, this will be hit.
  process.on("SIGINT", () => {
    server.close(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    server.close(() => process.exit(0));
  });

  return server;
} // end startServer

/* ============================================================
   handleRequest(req, res)

   DESCRIPTION
   -----------
   Main HTTP router.

   Supported:
     - OPTIONS /dispatch   (CORS preflight)
     - POST    /dispatch   (service call)

   Everything else: 404

   =========================================================== */
async function handleRequest(req, res) {
  const url = new URL(req.url, "http://localhost"); // base is required
  const pathname = url.pathname; // strips query string

  // Accept both /dispatch and /dispatch/
  const isDispatch =
    (pathname === "/dispatch" || pathname === "/dispatch/");

  if (req.method === "OPTIONS" && isDispatch) {
    sendCorsPreflight(res);
    return;
  }

  if (req.method === "POST" && isDispatch) {
    await handleDispatch(req, res);
    return;
  }

  sendJson(res, 404, { error: "Not found", method: req.method, url: req.url });
} // end handleRequest



/* ===========================================================
   handleDispatch(req, res)

   DESCRIPTION
   -----------
   Reads JSON request body, calls dispatchService(),
   and returns the result as JSON.

   =========================================================== */

async function handleDispatch(req, res) {
  try {
    const body = await readJsonBody(req);

    // Validate request envelope
    if (typeof body !== "object" || body === null) {
      sendJson(res, 400, { error: "Request body must be a JSON object" });
      return;
    }

    const requestName = body.requestName;
    const payload = body.payload;

    if (typeof requestName !== "string" || requestName.trim() === "") {
      sendJson(res, 400, { error: "requestName must be a non-empty string" });
      return;
    }

    // payload may be omitted; default to empty object
    let safePayload = payload;
    if (safePayload === undefined) safePayload = {};
    if (typeof safePayload !== "object" || safePayload === null || Array.isArray(safePayload)) {
      sendJson(res, 400, { error: "payload must be a JSON object (or omitted)" });
      return;
    }

    // Call dispatcher (task logic lives in sketchpadService.js)
    const result = await dispatchService(requestName, safePayload);

    sendJson(res, 200, result);
  }
  catch (err) {
    // Unknown requestName and validation errors thrown inside the dispatcher
    // are treated as 400 if they look like a usage error; otherwise 500.
    const message = (err && err.message) ? err.message : String(err);

    if (message.startsWith("dispatchService:")) {
      sendJson(res, 400, { error: message });
      return;
    }

    sendJson(res, 500, { error: message });
  }
} // end handleDispatch

/* ===========================================================
   readJsonBody(req)

   DESCRIPTION
   -----------
   Reads the entire request body and parses it as JSON.
   Fail-fast:
     - empty body → error
     - invalid JSON → error

   Returns:
     parsed JS object

   =========================================================== */

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      if (raw.length === 0) {
        reject(new Error("Empty request body"));
        return;
      }

      try {
        const obj = JSON.parse(raw);
        resolve(obj);
      }
      catch (err) {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
} // end readJsonBody

/* ============================================================
   sendJson(res, statusCode, obj)

   DESCRIPTION
   -----------
   Writes a JSON response with the given HTTP status
   and includes dev CORS headers for localhost UI access.

   =========================================================== */
function sendJson(res, statusCode, obj) {
  const text = JSON.stringify(obj, null, 2) + "\n";

  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(text),

    // Dev CORS (UI on 5173 calling service on 5174)
    "Access-Control-Allow-Origin": "http://localhost:5173",
    "Vary": "Origin"
  });

  res.end(text);
} // end sendJson

/* ============================================================
   sendCorsPreflight(res)

   DESCRIPTION
   -----------
   Responds to browser CORS preflight for POST /dispatch.

   =========================================================== */
function sendCorsPreflight(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "http://localhost:5173",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin"
  });

  res.end();
} // end sendCorsPreflight

/* ===========================================================
   MODULE AUTO-START

   DESCRIPTION
   -----------
   If this file is executed directly with Node, start the server.

   Typical usage:
     node ./node/sketchpadServer.js

   =========================================================== */

startServer(); // end module auto-start
