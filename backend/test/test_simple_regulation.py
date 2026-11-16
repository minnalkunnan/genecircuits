"""One gene activating or repressing another, across the Brick Bench slider ranges.

Steady state of an unregulated gene is its basal concentration. A regulated gene
settles at basal + (beta / gamma) * Hill(regulator, n, K). Activation must rise
as the regulator rises. Repression must fall.
"""

import numpy as np
import pytest

from backend import reg
from backend.ipc_server import run_simulation_handler
from backend.parser import parse_circuit
from backend.simulate import run_simulation


def _protein(name, init, loss, beta, basal, K=None, kind="steady-state"):
    data = {
        "label": name,
        "initialConcentration": init,
        "lossRate": loss,
        "beta": beta,
        "inputs": 1,
        "outputs": 1,
        "inputFunctionType": kind,
        "inputFunctionData": {
            "steadyStateValue": basal,
            "timeStart": 0,
            "timeEnd": 8,
            "pulsePeriod": 4,
            "amplitude": 3,
            "dutyCycle": 0.5,
        },
    }
    if K is not None:
        data["K"] = K
    return data


def _circuit(edge, n, beta_b, gamma_b, K, basal_a, basal_b, init_a=None, init_b=None, gamma_a=None, kind_a="steady-state", duration=None, include_k=True):
    if init_a is None:
        init_a = basal_a
    if init_b is None:
        init_b = basal_b
    if gamma_a is None:
        gamma_a = gamma_b if gamma_b > 0 else 1
    if duration is None:
        duration = 40 if gamma_b <= 0 else min(250, max(40, 15 / gamma_b))
    proteins = {
        "A": _protein("A", init_a, gamma_a, 1, basal_a, K if include_k else None, kind_a),
        "B": _protein("B", init_b, gamma_b, beta_b, basal_b, 1 if include_k else None),
    }
    if not include_k:
        proteins["A"].pop("K", None)
        proteins["B"].pop("K", None)
    return {
        "circuitSettings": {"projectName": "simple", "simulationDuration": duration, "numTimePoints": 40},
        "nodes": [
            {"id": "p1", "type": "custom", "proteinName": "A"},
            {"id": "p2", "type": "custom", "proteinName": "B"},
        ],
        "edges": [{"id": "e1", "type": edge, "source": "p1", "target": "p2"}],
        "proteins": proteins,
        "hillCoefficients": [{"id": "A-B", "value": n}] if n is not None else [],
    }


def _trace(payload):
    proteins = parse_circuit(payload)
    duration = payload["circuitSettings"]["simulationDuration"]
    t = np.linspace(0, duration, 300)
    y = run_simulation(t, proteins)
    return proteins, y


def _expected_b(edge, basal_a, n, K, basal_b, beta_b, gamma_b):
    hill = reg.act_hill(basal_a, n, K) if edge == "promote" else reg.rep_hill(basal_a, n, K)
    return basal_b + (beta_b / gamma_b) * hill


def test_simple_activation_and_repression_match_steady_state_across_slider_ranges():
    failures = []
    for edge in ("promote", "repress"):
        for n in (1, 2, 4, 8):
            for beta_b in (0.05, 1.0, 10.0):
                for gamma_b in (0.05, 0.2, 1.0, 2.0):
                    for K in (0.05, 0.2, 1.0, 2.0):
                        for basal_a in (0.0, 0.25, 1.0, 2.0):
                            for basal_b in (0.0, 0.5, 2.0):
                                payload = _circuit(edge, n, beta_b, gamma_b, K, basal_a, basal_b)
                                try:
                                    _, y = _trace(payload)
                                except Exception as exc:
                                    failures.append(f"{edge} n={n} β={beta_b} γ={gamma_b} K={K} basal=({basal_a},{basal_b}) raised {type(exc).__name__}: {exc}")
                                    continue
                                if y is None or not np.all(np.isfinite(y)) or np.any(y < -1e-6):
                                    failures.append(f"{edge} n={n} β={beta_b} γ={gamma_b} K={K} basal=({basal_a},{basal_b}) non-finite or negative")
                                    continue
                                expected = _expected_b(edge, basal_a, n, K, basal_b, beta_b, gamma_b)
                                err = abs(y[-1, 1] - expected)
                                if err > 0.01 * max(1.0, abs(expected)) + 1e-3:
                                    failures.append(
                                        f"{edge} n={n} β={beta_b} γ={gamma_b} K={K} basal=({basal_a},{basal_b}) "
                                        f"got {y[-1, 1]:.5g} want {expected:.5g}"
                                    )
    assert failures == []


def test_raising_the_regulator_moves_the_target_in_the_right_direction():
    failures = []
    for edge, sign in (("promote", 1), ("repress", -1)):
        for n in (1, 2, 4, 8):
            for beta_b in (0.05, 1.0, 10.0):
                for gamma_b in (0.05, 1.0, 2.0):
                    for K in (0.05, 1.0, 2.0):
                        for basal_b in (0.0, 1.0):
                            _, low = _trace(_circuit(edge, n, beta_b, gamma_b, K, 0.0, basal_b))
                            _, high = _trace(_circuit(edge, n, beta_b, gamma_b, K, 2.0, basal_b))
                            delta = high[-1, 1] - low[-1, 1]
                            if sign * delta < -1e-4:
                                failures.append(f"{edge} n={n} β={beta_b} γ={gamma_b} K={K} basalB={basal_b} delta {delta}")
                                continue
                            hill_lo = reg.act_hill(0.0, n, K) if edge == "promote" else reg.rep_hill(0.0, n, K)
                            hill_hi = reg.act_hill(2.0, n, K) if edge == "promote" else reg.rep_hill(2.0, n, K)
                            expected = (beta_b / gamma_b) * (hill_hi - hill_lo)
                            if abs(delta - expected) > 0.02 * max(1.0, abs(expected)) + 0.02:
                                failures.append(
                                    f"{edge} n={n} β={beta_b} γ={gamma_b} K={K} basalB={basal_b} "
                                    f"delta {delta:.5g} want {expected:.5g}"
                                )
    assert failures == []


def test_handler_accepts_a_single_promote_or_repress_edge():
    for edge in ("promote", "repress"):
        result = run_simulation_handler(_circuit(edge, 2, 1, 1, 1, 1, 0, duration=20))
        assert result["ok"] is True
        conc = np.array(result["data"]["concentrations"])
        assert result["data"]["proteinNames"] == ["A", "B"]
        assert np.all(np.isfinite(conc))
        assert np.all(conc >= -1e-8)


def test_missing_k_and_missing_hill_use_defaults():
    _, y = _trace(_circuit("promote", 2, 2, 1, 1, 1, 0, include_k=False))
    assert y[-1, 1] == pytest.approx(2 * reg.act_hill(1, 2, 1))

    payload = _circuit("repress", None, 2, 1, 1, 1, 0)
    payload["hillCoefficients"] = []
    _, y = _trace(payload)
    assert y[-1, 1] == pytest.approx(2 * reg.rep_hill(1, 1, 1))


def test_zero_production_relaxes_to_basal_and_zero_degradation_stays_finite():
    _, y = _trace(_circuit("promote", 2, 0, 1, 1, 2, 0.4, init_b=3))
    assert y[-1, 1] == pytest.approx(0.4, abs=1e-3)

    for edge in ("promote", "repress"):
        _, y = _trace(_circuit(edge, 2, 1, 0, 1, 1, 0, duration=10, gamma_a=1))
        assert np.all(np.isfinite(y))
        assert np.all(y >= -1e-8)
        assert y[-1, 1] == pytest.approx(5.0, abs=1e-3)


def test_self_regulation_stays_finite():
    for edge in ("promote", "repress"):
        payload = {
            "circuitSettings": {"projectName": "self", "simulationDuration": 40, "numTimePoints": 20},
            "nodes": [{"id": "p1", "type": "custom", "proteinName": "A"}],
            "edges": [{"id": "e", "type": edge, "source": "p1", "target": "p1"}],
            "proteins": {"A": _protein("A", 0.2, 1, 2, 0.1, 1)},
            "hillCoefficients": [{"id": "A-A", "value": 2}],
        }
        proteins, y = _trace(payload)
        assert proteins[0].mGates[0].mType == ("act_hill" if edge == "promote" else "rep_hill")
        assert np.all(np.isfinite(y))
        assert np.all(y >= -1e-8)


def test_pulse_input_on_an_activator_lifts_the_target():
    driven = _circuit("promote", 2, 1, 1, 1, 0, 0, init_a=0, init_b=0, duration=20, gamma_a=0, kind_a="pulse")
    driven["proteins"]["A"]["lossRate"] = 0
    quiet = _circuit("promote", 2, 1, 1, 1, 0, 0, init_a=0, init_b=0, duration=20, gamma_a=1)
    _, y_driven = _trace(driven)
    _, y_quiet = _trace(quiet)
    assert y_driven[:, 1].max() > y_quiet[:, 1].max() + 0.2
    assert np.all(np.isfinite(y_driven))


def test_brick_bench_single_regulator_payload_settles():
    # Mirrors compileCircuit for promoter + DBD_A + activator, regulating operator A + GFP.
    payload = _circuit("promote", 4, 3, 1, 0.8, 0.4, 0.2, init_a=1, init_b=0, duration=80, gamma_a=0.5)
    payload["proteins"]["A"]["beta"] = 2
    payload["proteins"]["A"]["initialConcentration"] = 1
    _, y = _trace(payload)
    expected = _expected_b("promote", 0.4, 4, 0.8, 0.2, 3, 1)
    assert y[-1, 0] == pytest.approx(0.4, abs=1e-3)
    assert y[-1, 1] == pytest.approx(expected, abs=1e-3)
