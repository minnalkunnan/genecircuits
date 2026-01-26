// backend/src/pythonClient.ts
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import * as path from "node:path";

type Pending = {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
};

export type PythonClientOptions = {
  executablePath: string;
  timeoutMs: number;
};

export class PythonIpcClient {
  private proc: ChildProcessWithoutNullStreams;
  private pending: Map<string, Pending> = new Map();

  private messageBuffer: Buffer = Buffer.alloc(0);
  private expectedLength: number | null = null;

  constructor(opts: PythonClientOptions) {
    this.proc = spawn(opts.executablePath, [], { stdio: ["pipe", "pipe", "pipe"] });

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
 * Helper to compute the same backend executable path Electron uses.
 * Use this in server.ts so web mode and electron dev mode match.
 */
export function resolvePyInstallerExecutablePath(): string {
  const base = path.join(__dirname, ".."); // <repo>/backend
  let exe = path.join(base, "dist", "app");

  if (process.platform === "win32") exe += ".exe";
  return exe;
}
