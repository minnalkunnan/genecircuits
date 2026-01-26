import json
from pathlib import Path

FIX = Path(__file__).parent / "fixtures"

def _load(name: str):
    return json.loads((FIX / name).read_text("utf-8"))

def test_dto_imports():
    from backend.contracts.dto import SimulationRequest, SimulationResponse  # noqa: F401

def test_openapi_exists():
    spec = Path(__file__).resolve().parents[1] / "openapi.yaml"
    assert spec.exists()
    text = spec.read_text("utf-8")
    assert "/api/simulate:" in text
    assert "/api/health:" in text

def test_fixture_shapes_load():
    assert isinstance(_load("simulate.request.json"), dict)
    assert isinstance(_load("simulate.response.success.json"), dict)
    assert isinstance(_load("simulate.response.error.json"), dict)
    assert isinstance(_load("simulate.response.nocircuit.json"), dict)
