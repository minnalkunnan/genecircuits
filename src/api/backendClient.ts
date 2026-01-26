// src/api/backendClient.ts (Electron-only legacy path)

function requireElectron(): any {
  if (typeof window === "undefined") {
    throw new Error("Electron IPC is not available (no window).");
  }
  const w = window as any;
  if (!w.electron) {
    throw new Error("Electron IPC is not available (window.electron missing).");
  }
  return w.electron;
}

export async function runSimulation(circuitJson: unknown): Promise<any> {
  const electron = requireElectron();
  if (typeof electron.runSimulation !== "function") {
    throw new Error("Electron IPC runSimulation is not available.");
  }
  return electron.runSimulation(circuitJson);
}

export async function getBackendReady(): Promise<boolean> {
  const electron = requireElectron();
  if (typeof electron.getBackendStatus !== "function") return false;
  return electron.getBackendStatus();
}
