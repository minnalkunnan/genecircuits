// backend/src/pythonClient.ts
import * as fs from "node:fs";
import {
  spawn,
  type ChildProcessWithoutNullStreams,
  type SpawnOptionsWithoutStdio,
} from "node:child_process";
import * as path from "node:path";

type Pending = {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
};

/** How to launch the simulator IPC child (PyInstaller bundle or Python interpreter). */
export type PythonIpcSpawnConfig = {
  command: string;
  args: string[];
  options: SpawnOptionsWithoutStdio;
};

export type PythonClientOptions = {
  spawnConfig: PythonIpcSpawnConfig;
  timeoutMs: number;
};

export class PythonIpcClient {
  private proc: ChildProcessWithoutNullStreams;
  private pending: Map<string, Pending> = new Map();

  private messageBuffer: Buffer = Buffer.alloc(0);
  private expectedLength: number | null = null;

  constructor(opts: PythonClientOptions) {
    const { command, args, options } = opts.spawnConfig;
    this.proc = spawn(command, args, {
      ...options,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.proc.stdout.on("data", (chunk: Buffer) => {
      this.handleData(chunk);
    });

    // Keep stderr passthrough (but remove debug/tracing)
    this.proc.stderr.on("data", (chunk: Buffer) => {
      process.stderr.write(chunk);
    });

    // Keep functional close behavior: reject all pending on process close
    this.proc.on("close", (code, signal) => {
      const err = new Error(`Python process exited. code=${code} signal=${signal ?? "null"}`);
      for (const { reject } of this.pending.values()) reject(err);
      this.pending.clear();
    });
  }

  stop() {
    if (!this.proc.killed) this.proc.kill();
  }

  private handleData(data: Buffer) {
    this.messageBuffer = Buffer.concat([this.messageBuffer, data]);

    while (this.messageBuffer.length > 0) {
      if (this.expectedLength === null) {
        if (this.messageBuffer.length < 4) return;
        this.expectedLength = this.messageBuffer.readUInt32LE(0);
        this.messageBuffer = this.messageBuffer.slice(4);
      }

      if (this.expectedLength !== null && this.messageBuffer.length >= this.expectedLength) {
        const messageData = this.messageBuffer.slice(0, this.expectedLength);
        this.messageBuffer = this.messageBuffer.slice(this.expectedLength);

        try {
          const message = JSON.parse(messageData.toString("utf8"));
          const requestId = message?.requestId;

          if (requestId && this.pending.has(requestId)) {
            const { resolve } = this.pending.get(requestId)!;
            this.pending.delete(requestId);
            resolve(message);
          }
        } catch {
          // keep behavior: ignore malformed frames (no debug logging)
        }

        this.expectedLength = null;
        continue;
      }

      return;
    }
  }

  async request<TResponse>(message: any, timeoutMs: number): Promise<TResponse> {
    const requestId = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    message.requestId = requestId;

    const payloadStr = JSON.stringify(message);
    const payloadBuf = Buffer.from(payloadStr, "utf8");

    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32LE(payloadBuf.length, 0);

    return new Promise<TResponse>((resolve, reject) => {
      const t = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Python IPC timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pending.set(requestId, {
        resolve: (val) => {
          clearTimeout(t);
          resolve(val as TResponse);
        },
        reject: (err) => {
          clearTimeout(t);
          reject(err);
        },
      });

      this.proc.stdin.write(lenBuf);
      this.proc.stdin.write(payloadBuf);
    });
  }

  async ping(timeoutMs: number) {
    const resp = await this.request<{ success?: boolean }>({ command: "ping" }, timeoutMs);
    return resp;
  }

  async runSimulation(circuitData: unknown, timeoutMs: number) {
    const resp = await this.request<any>(
      { command: "run_simulation", data: circuitData },
      timeoutMs
    );
    return resp;
  }
}

/**
 * Prefer `backend/dist/app` (PyInstaller) when present — same as packaged Electron.
 * If it is missing (typical local dev), fall back to `python3 backend/ipc_server.py`
 * with `PYTHONPATH` set to the repo root so `from backend.parser` resolves.
 *
 * Set `GENECIRCUITS_USE_PYTHON_IPC=1` to force the Python interpreter even when the
 * frozen binary exists. Set `PYTHON` to choose the interpreter (default `python3` /
 * Windows `python`).
 */
export function resolvePythonIpcSpawnConfig(): PythonIpcSpawnConfig {
  const backendRoot = path.join(__dirname, ".."); // backend/ (contains ipc_server.py, dist/)
  const repoRoot = path.join(backendRoot, "..");

  let exe = path.join(backendRoot, "dist", "app");
  if (process.platform === "win32") exe += ".exe";

  const forcePython =
    process.env.GENECIRCUITS_USE_PYTHON_IPC === "1" ||
    process.env.GENECIRCUITS_USE_PYTHON_IPC === "true";

  if (!forcePython && fs.existsSync(exe)) {
    return { command: exe, args: [], options: {} };
  }

  const script = path.join(backendRoot, "ipc_server.py");

  const venvUnix = path.join(backendRoot, "flask-env", "bin", "python3");
  const venvUnixPy = path.join(backendRoot, "flask-env", "bin", "python");
  const venvWin = path.join(backendRoot, "flask-env", "Scripts", "python.exe");

  let defaultPython =
    process.platform === "win32" ? "python" : "python3";
  if (process.platform === "win32" && fs.existsSync(venvWin)) {
    defaultPython = venvWin;
  } else if (fs.existsSync(venvUnix)) {
    defaultPython = venvUnix;
  } else if (fs.existsSync(venvUnixPy)) {
    defaultPython = venvUnixPy;
  }

  const pythonBin = process.env.PYTHON ?? defaultPython;

  if (!fs.existsSync(exe)) {
    // eslint-disable-next-line no-console
    console.warn(
      "[backend] dist/app not found (optional: `pyinstaller app.spec` in backend/). " +
        `Using ${pythonBin} for IPC.`,
    );
  }

  return {
    command: pythonBin,
    args: [script],
    options: {
      cwd: repoRoot,
      env: { ...process.env, PYTHONPATH: repoRoot },
    },
  };
}

/** @deprecated Use resolvePythonIpcSpawnConfig — kept for any external imports. */
export function resolvePyInstallerExecutablePath(): string {
  return resolvePythonIpcSpawnConfig().command;
}
