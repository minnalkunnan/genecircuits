// src/api/backendClient.web.ts
// Used by Vite (browser) and Electron webpack renderer: prefer IPC when `preload` exposed `window.electron`.

type ElectronPreload = {
  runSimulation?: (circuitData: unknown) => Promise<unknown>;
  getBackendStatus?: () => Promise<boolean>;
};

function electronBridge(): ElectronPreload | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { electron?: ElectronPreload }).electron;
}

export async function runSimulation(circuitJson: unknown): Promise<any> {
  const e = electronBridge();
  if (e?.runSimulation) {
    return e.runSimulation(circuitJson);
  }

  const resp = await fetch("/api/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(circuitJson),
  });

  const text = await resp.text();
  const json = text ? JSON.parse(text) : {};

  if (!resp.ok) {
    const msg = (json?.error as string) ?? `HTTP /api/simulate failed with status ${resp.status}`;
    throw new Error(msg);
  }

  return json;
}

export async function getBackendReady(): Promise<boolean> {
  const e = electronBridge();
  if (e && typeof e.getBackendStatus === "function") {
    try {
      return await e.getBackendStatus();
    } catch {
      return false;
    }
  }

  try {
    const resp = await fetch("/api/health", { method: "GET" });
    return resp.ok;
  } catch {
    return false;
  }
}
