import os

# -------------------------------------------------------------------
# Frozen-binary / BLAS/OpenMP deadlock mitigation (must be BEFORE numpy/scipy imports)
# -------------------------------------------------------------------
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("VECLIB_MAXIMUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")

import argparse
import base64
import io
import json
import sys
import time
import traceback

import numpy as np
import matplotlib

# Use non-interactive backend for matplotlib (safe in headless / frozen)
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from backend.parser import parse_circuit
from backend.simulate import run_simulation


# -----------------------------
# Logging (stderr) — always flush
# -----------------------------
def _stderr(msg: str) -> None:
    try:
        sys.stderr.write(msg.rstrip("\n") + "\n")
        sys.stderr.flush()
    except Exception:
        pass


# -----------------------------
# IPC framing helpers
# -----------------------------
def _read_exact(n: int) -> bytes:
    """Read exactly n bytes from stdin.buffer or return b'' on clean EOF."""
    buf = b""
    while len(buf) < n:
        chunk = sys.stdin.buffer.read(n - len(buf))
        if not chunk:
            return b""
        buf += chunk
    return buf


def read_message() -> dict | None:
    """Read one length-prefixed JSON message. Returns None on EOF."""
    length_bytes = _read_exact(4)
    if not length_bytes:
        return None
    msg_len = int.from_bytes(length_bytes, byteorder="little", signed=False)
    if msg_len <= 0:
        return None
    body = _read_exact(msg_len)
    if not body:
        return None
    try:
        return json.loads(body.decode("utf-8"))
    except Exception:
        _stderr("[ipc] ERROR: failed to decode JSON message")
        _stderr(traceback.format_exc())
        return {
            "command": "__decode_error__",
            "requestId": None,
            "payload": {},
        }


def write_response(obj: dict) -> None:
    """Write one length-prefixed JSON response to stdout.buffer."""
    data = json.dumps(obj).encode("utf-8")
    sys.stdout.buffer.write(len(data).to_bytes(4, byteorder="little", signed=False))
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()


# -----------------------------
# Handlers
# -----------------------------
def ping_handler(_: dict) -> dict:
    return {"ok": True, "pong": True}


def run_simulation_handler(payload: dict) -> dict:
    t0 = time.time()
    _stderr("[run_simulation] handler: start")

    try:
        # Parse circuit
        t_parse0 = time.time()
        protein_array = parse_circuit(payload)
        _stderr(f"[run_simulation] parse_circuit done in {time.time() - t_parse0:.3f}s")

        if not protein_array:
            _stderr("[run_simulation] no circuit provided")
            return {"ok": True, "message": "No circuit provided"}

        # Params
        circuit_settings = payload.get("circuitSettings", {}) or {}
        duration = circuit_settings.get("simulationDuration", 20)
        raw_num = circuit_settings.get("numTimePoints", 1000)

        # Higher resolution for smoothness (keep your current behavior)
        n = int(raw_num) * 10
        _stderr(f"[run_simulation] duration={duration} numTimePoints(raw)={raw_num} n={n}")

        # Build t
        t_lin0 = time.time()
        t = np.linspace(0, duration, n)
        _stderr(f"[run_simulation] linspace built in {time.time() - t_lin0:.3f}s")

        # Run simulation
        _stderr("[run_simulation] calling backend.simulate.run_simulation...")
        t_sim0 = time.time()
        final_concentrations = run_simulation(t, protein_array)
        _stderr(f"[run_simulation] run_simulation returned in {time.time() - t_sim0:.3f}s")

        if final_concentrations is None or (
            isinstance(final_concentrations, np.ndarray) and final_concentrations.size == 0
        ):
            _stderr("[run_simulation] ERROR: simulation produced no results")
            return {"ok": False, "error": "Simulation failed to produce results"}

        # Plot
        _stderr("[run_simulation] plotting...")
        t_plot0 = time.time()

        plt.figure(figsize=(10, 6))
        for i, protein in enumerate(protein_array):
            plt.plot(t, final_concentrations[:, i], label=protein.getName())

        plt.xlabel("Time")
        plt.ylabel("Concentration")
        plt.title(f"Simulation Results ({duration}s)")
        plt.legend()
        plt.grid(True, alpha=0.3)

        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=100)
        buf.seek(0)
        image_base64 = base64.b64encode(buf.read()).decode("utf-8")
        plt.close()

        _stderr(f"[run_simulation] plotting+encode done in {time.time() - t_plot0:.3f}s")

        # Downsample for transfer
        protein_names = [p.getName() for p in protein_array]
        time_points = t.tolist()[::10]
        concentration_data = final_concentrations[::10].tolist()

        _stderr(f"[run_simulation] handler: done total {time.time() - t0:.3f}s")
        return {
            "ok": True,
            "image": image_base64,
            "data": {
                "proteinNames": protein_names,
                "timePoints": time_points,
                "concentrations": concentration_data,
            },
        }

    except Exception as e:
        tb = traceback.format_exc()
        _stderr(f"[run_simulation] EXCEPTION after {time.time() - t0:.3f}s: {e}")
        _stderr(tb)
        return {"ok": False, "error": str(e), "traceback": tb}


# -----------------------------
# One-message processing (shared by loop + --once)
# -----------------------------
def process_one() -> bool:
    msg = read_message()
    if msg is None:
        _stderr("[ipc] stdin EOF; exiting")
        return False

    command = msg.get("command")
    request_id = msg.get("requestId")
    payload = msg.get("payload") or msg.get("data") or {}

    _stderr(f"[ipc] receive command={command} requestId={request_id}")

    t_cmd0 = time.time()
    try:
        if command == "ping":
            _stderr("[ipc] handler start: ping")
            result = ping_handler(payload)
            _stderr(f"[ipc] handler end: ping in {time.time() - t_cmd0:.3f}s")

        elif command == "run_simulation":
            _stderr("[ipc] handler start: run_simulation")
            result = run_simulation_handler(payload)
            _stderr(f"[ipc] handler end: run_simulation in {time.time() - t_cmd0:.3f}s")

        else:
            result = {"ok": False, "error": f"Unknown command: {command}"}

    except Exception as e:
        tb = traceback.format_exc()
        _stderr(f"[ipc] DISPATCH EXCEPTION: {e}")
        _stderr(tb)
        result = {"ok": False, "error": str(e), "traceback": tb}

    # Always include requestId for multiplexing
    if isinstance(result, dict):
        result["requestId"] = request_id
    else:
        result = {"ok": True, "result": result, "requestId": request_id}

    _stderr("[ipc] response write: start")
    t_w0 = time.time()
    write_response(result)
    _stderr(f"[ipc] response write: done in {time.time() - t_w0:.3f}s")

    return True


# -----------------------------
# Main loop
# -----------------------------
def main(once: bool = False) -> None:
    _stderr("[ipc] server starting")

    if once:
        process_one()
        _stderr("[ipc] --once complete; exiting")
        return

    while True:
        ok = process_one()
        if not ok:
            break


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--once", action="store_true", help="Process exactly one IPC message then exit")
    args = ap.parse_args()
    main(once=args.once)
