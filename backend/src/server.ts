// backend/src/server.ts
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { PythonIpcClient, resolvePyInstallerExecutablePath } from "./pythonClient";

const app = express();
app.use(express.json({ limit: "10mb" }));

const TIMEOUT_MS = Number(process.env.PY_IPC_TIMEOUT_MS ?? "120000");

// Bind explicitly to IPv4 loopback by default to avoid localhost -> ::1 issues.
// Allow override via env.
const HOST = process.env.HOST ?? "127.0.0.1";

// Single Python process for the HTTP server lifetime.
const py = new PythonIpcClient({
  executablePath: resolvePyInstallerExecutablePath(),
  timeoutMs: TIMEOUT_MS,
});

app.get("/api/health", async (_req, res) => {
  try {
    await py.ping(30_000);
    res.status(200).json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Health ping failed:", err);
    res.status(503).json({ ok: false });
  }
});

app.post("/api/simulate", async (req, res, next) => {
  try {
    const result = await py.runSimulation(req.body, TIMEOUT_MS);
    res.status(200).json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("POST /api/simulate error:", err);
    next(err);
  }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const msg = err instanceof Error ? err.message : String(err);
  res.status(500).json({ ok: false, error: msg });
});

export function startServer(port: number) {
  const server = app.listen(port, HOST);

  // Best-effort cleanup
  const shutdown = () => {
    try {
      py.stop();
    } finally {
      server.close(() => process.exit(0));
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return server;
}
