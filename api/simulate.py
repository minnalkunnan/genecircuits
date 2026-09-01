from __future__ import annotations

import json
import os
import traceback
from http.server import BaseHTTPRequestHandler

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("VECLIB_MAXIMUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")
import numpy as np

from backend.parser import parse_circuit
from backend.simulate import run_simulation


def build_simulation_response(payload: dict) -> tuple[int, dict]:
    try:
        protein_array = parse_circuit(payload)
        if not protein_array:
            return 200, {"success": True, "message": "No circuit provided"}

        circuit_settings = payload.get("circuitSettings", {}) or {}
        duration = circuit_settings.get("simulationDuration", 20)
        raw_num = circuit_settings.get("numTimePoints", 1000)
        n = int(raw_num) * 10

        t = np.linspace(0, duration, n)
        final_concentrations = run_simulation(t, protein_array)

        if final_concentrations is None or (
            isinstance(final_concentrations, np.ndarray) and final_concentrations.size == 0
        ):
            return 500, {"success": False, "error": "Simulation failed to produce results"}

        protein_names = [p.getName() for p in protein_array]
        time_points = t.tolist()[::10]
        concentration_data = final_concentrations[::10].tolist()

        return 200, {
            "success": True,
            "data": {
                "proteinNames": protein_names,
                "timePoints": time_points,
                "concentrations": concentration_data,
            },
        }
    except Exception as exc:
        return 500, {
            "success": False,
            "error": str(exc),
            "traceback": traceback.format_exc(),
        }


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length) if content_length > 0 else b"{}"
            payload = json.loads(raw_body.decode("utf-8") or "{}")
        except Exception:
            status = 400
            body = {
                "success": False,
                "error": "Invalid JSON request body",
                "traceback": traceback.format_exc(),
            }
        else:
            status, body = build_simulation_response(payload)

        response = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)
