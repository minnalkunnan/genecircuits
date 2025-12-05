import sys
import os
import pytest
import json
from backend.parser import parse_circuit
from backend.protein import Protein, Gate

DATA_DIR = os.path.join(os.path.dirname(__file__), "parser_test_data")


def test_toggle_switch_array_equivalence():
    # Inline JSON-like dict representing a toggle switch
    with open(os.path.join(DATA_DIR, "toggle_switch_input.json")) as f:
        json_data = json.load(f)


    # Parse into protein array
    parsed_proteins = parse_circuit(json_data)

    # Expected array of Protein objects (adjust params to match parser logic)
    expected_proteins = [
        Protein(0, "Protein A", 1, 1, [Gate("rep_hill", firstInput=1, firstHill=2)], None, None, 5),
        Protein(1, "Protein B", 1, 1, [Gate("rep_hill", firstInput=0, firstHill=2)], None, None, 5)
    ]

    assert len(parsed_proteins) == len(expected_proteins)

    # Compare parsed vs expected
    for p, e in zip(parsed_proteins, expected_proteins):
        assert p.mName == e.mName
        assert p.mInternalConc == e.mInternalConc
        assert p.mDegradation == e.mDegradation
        assert p.mBeta == e.mBeta
        assert len(p.mGates) == len(e.mGates)

        for g1, g2 in zip(p.mGates, e.mGates):
            assert g1.mType == g2.mType
            assert g1.mFirstInput == g2.mFirstInput
            assert g1.mFirstHill == g2.mFirstHill
            assert g1.mSecondHill == g2.mSecondHill

def main():
    print("Running all test cases...")
    pytest.main(["-v", "test_toggle_switch.py::test_toggle_switch_array_equivalence"])

# Run the script
if __name__ == '__main__':
    main()