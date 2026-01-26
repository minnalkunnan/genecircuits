// src/api/backendClient.web.ts
export async function runSimulation(circuitJson: unknown): Promise<any> {
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
  try {
    const resp = await fetch("/api/health", { method: "GET" });
    return resp.ok;
  } catch {
    return false;
  }
}
