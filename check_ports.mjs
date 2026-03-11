import net from "net";

function probe(port) {
  return new Promise((resolve) => {
    const s = net.createServer();

    s.once("error", (err) => {
      if (err.code === "EADDRINUSE") resolve({ port, free: false });
      else resolve({ port, free: false, err });
    });

    s.once("listening", () => {
      s.close(() => resolve({ port, free: true }));
    });

    s.listen(port, "127.0.0.1");
  });
} // end probe

async function main() {
  const ports = [5173, 5174];
  const results = [];

  for (const p of ports) results.push(await probe(p));

  const busy = results.filter(r => !r.free);

  if (busy.length) {
    console.error("Sketchpad cannot start because these ports are in use:");
    for (const b of busy) console.error(`  - ${b.port}`);
    console.error("Fix: close the other process, or change ports in package.json.");
    process.exit(1);
  }

  process.exit(0);
} // end main

main();
