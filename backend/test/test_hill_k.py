import pytest

from backend.parser import parse_circuit
from backend.protein import Gate
from backend import reg


class _Conc:
    def __init__(self, value):
        self.value = value

    def getConcentration(self):
        return self.value


def _protein(name, init=0.0, loss=1.0, beta=1.0, basal=0.0, K=None):
    data = {
        "label": name,
        "initialConcentration": init,
        "lossRate": loss,
        "beta": beta,
        "inputs": 1,
        "outputs": 1,
        "inputFunctionType": "steady-state",
        "inputFunctionData": {
            "steadyStateValue": basal,
            "timeStart": 0,
            "timeEnd": 1,
            "pulsePeriod": 1,
            "amplitude": 1,
            "dutyCycle": 0.5,
        },
    }
    if K is not None:
        data["K"] = K
    return data


def test_default_k_matches_explicit_one():
    assert reg.rep_hill(1.0, 2) == pytest.approx(reg.rep_hill(1.0, 2, 1.0))
    assert reg.act_hill(1.0, 2) == pytest.approx(reg.act_hill(1.0, 2, 1.0))
    assert reg.aa_and(0.5, 0.8, 2, 2) == pytest.approx(reg.aa_and(0.5, 0.8, 2, 2, 1.0, 1.0))
    assert reg.rep_hill(1.0, 2) == pytest.approx(1.0 / (1.0 + 1.0 ** 2))


def test_larger_k_weakens_regulation():
    assert reg.rep_hill(1.0, 2, 2.0) > reg.rep_hill(1.0, 2, 1.0)
    assert reg.act_hill(1.0, 2, 2.0) < reg.act_hill(1.0, 2, 1.0)
    assert reg.aa_and(1.0, 1.0, 2, 2, 2.0, 2.0) < reg.aa_and(1.0, 1.0, 2, 2, 1.0, 1.0)


def test_gate_default_k_matches_explicit_one():
    proteins = [_Conc(1.0)]
    default = Gate("rep_hill", firstInput=0, firstHill=2)
    explicit = Gate("rep_hill", firstInput=0, firstHill=2, firstK=1)
    weaker = Gate("rep_hill", firstInput=0, firstHill=2, firstK=2)
    assert default.mFirstK == 1
    assert default.regFunc(proteins) == pytest.approx(explicit.regFunc(proteins))
    assert weaker.regFunc(proteins) > default.regFunc(proteins)


def test_parser_defaults_missing_k_to_one():
    circuit = {
        "nodes": [
            {"id": "p1", "type": "custom", "proteinName": "R"},
            {"id": "p2", "type": "custom", "proteinName": "G"},
        ],
        "edges": [{"id": "e", "type": "repress", "source": "p1", "target": "p2"}],
        "proteins": {"R": _protein("R"), "G": _protein("G")},
        "hillCoefficients": [{"id": "R-G", "value": 2}],
    }
    proteins = {p.mName: p for p in parse_circuit(circuit)}
    assert proteins["R"].mK == 1
    assert proteins["G"].mGates[0].mFirstK == 1
    assert proteins["G"].mGates[0].mFirstHill == 2


def test_parser_passes_regulator_k_into_the_gate():
    circuit = {
        "nodes": [
            {"id": "p1", "type": "custom", "proteinName": "R"},
            {"id": "p2", "type": "custom", "proteinName": "G"},
        ],
        "edges": [{"id": "e", "type": "repress", "source": "p1", "target": "p2"}],
        "proteins": {"R": _protein("R", K=2), "G": _protein("G")},
        "hillCoefficients": [{"id": "R-G", "value": 2}],
    }
    proteins = {p.mName: p for p in parse_circuit(circuit)}
    gate = proteins["G"].mGates[0]
    proteins["R"].mInternalConc = 1.0
    proteins["R"].mExternalConc = 0.0
    proteins["G"].mExternalConc = 0.0
    assert proteins["R"].mK == 2
    assert gate.mFirstK == 2
    assert gate.regFunc([proteins["R"], proteins["G"]]) == pytest.approx(reg.rep_hill(1.0, 2, 2))
