import sys
import os
import numpy as np
import pytest
import json
from backend.parser import parse_circuit
from backend.protein import Protein, Gate

DATA_DIR = os.path.join(os.path.dirname(__file__), "parser_test_data")


def test_repressilator_array_equivalence():
    # Load JSON input matching the known-good test configuration
    with open(os.path.join(DATA_DIR, "repressilator_input.json")) as f:
        json_data = json.load(f)
    
    print("Raw JSON hillCoefficients:")
    for h in json_data["hillCoefficients"]:
        print(h)

    # Parse it into a protein array via your circuit parser
    parsed_proteins = parse_circuit(json_data)

    # Define the expected protein array manually (same as in test_repressilator)
    expected_proteins = [
        Protein(0, "Protein 0", 1, 1, [Gate("rep_hill", firstInput=2, firstHill=1)], None, None, 5),
        Protein(1, "Protein 1", 1, 1, [Gate("rep_hill", firstInput=0, firstHill=1)], None, None, 5),
        Protein(2, "Protein 2", 1.2, 1, [Gate("rep_hill", firstInput=1, firstHill=1)], None, None, 5)
    ]

    assert len(parsed_proteins) == len(expected_proteins)

    for p in parsed_proteins:
        print("Parsed protein:", p.mName, p.mInternalConc, p.mBeta, [(g.mType, g.mFirstInput, g.mFirstHill) for g in p.mGates])

    for e in expected_proteins:
        print("Expected protein:", e.mName, e.mInternalConc, e.mBeta, [(g.mType, g.mFirstInput, g.mFirstHill) for g in e.mGates])

    for p, e in zip(parsed_proteins, expected_proteins):
        assert p.mName == e.mName
        assert p.mInternalConc == e.mInternalConc
        assert p.mDegradation == e.mDegradation
        assert p.mBeta == e.mBeta
        assert len(p.mGates) == len(e.mGates)

        for g1, g2 in zip(p.mGates, e.mGates):
            assert g1.mType == g2.mType
            assert g1.mFirstHill == g2.mFirstHill
            assert g1.mSecondHill == g2.mSecondHill


def main():
    print("Running all test cases...")
    pytest.main(["-v", "test_repressilator.py::test_repressilator_array_equivalence"])

# Run the script
if __name__ == '__main__':
    main()