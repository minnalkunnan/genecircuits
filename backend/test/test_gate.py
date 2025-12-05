import sys
import os
import pytest
import numpy as np
import biocircuits
from backend.protein import Gate, Protein

class TestGate:
    """Unit tests for the Gate class"""

    def test_init(self):
        gate = Gate("aa_and", firstInput=0, secondInput=1, firstHill=2, secondHill=2)
        assert gate.mType == "aa_and"
        assert gate.mFirstInput == 0
        assert gate.mSecondInput == 1
        assert gate.mFirstHill == 2
        assert gate.mSecondHill == 2

    def test_aa_and_gate(self):
        gate = Gate("aa_and", firstInput=0, secondInput=1, firstHill=2, secondHill=2)
        protein_array = [MockProtein(0.5), MockProtein(0.8)]
        result = gate.regFunc(protein_array)
        expected = biocircuits.aa_and(0.5, 0.8, 2, 2)
        assert result == pytest.approx(expected)

    def test_aa_or_gate(self):
        gate = Gate("aa_or", firstInput=0, secondInput=1, firstHill=2, secondHill=2)
        protein_array = [MockProtein(0.5), MockProtein(0.8)]
        result = gate.regFunc(protein_array)
        expected = biocircuits.aa_or(0.5, 0.8, 2, 2)
        assert result == pytest.approx(expected)

    def test_aa_or_single_gate(self):
        gate = Gate("aa_or_single", firstInput=0, secondInput=1, firstHill=2, secondHill=2)
        protein_array = [MockProtein(0.5), MockProtein(0.8)]
        result = gate.regFunc(protein_array)
        expected = biocircuits.aa_or_single(0.5, 0.8, 2, 2)
        assert result == pytest.approx(expected)

    def test_rr_and_gate(self):
        gate = Gate("rr_and", firstInput=0, secondInput=1, firstHill=2, secondHill=2)
        protein_array = [MockProtein(0.5), MockProtein(0.8)]
        result = gate.regFunc(protein_array)
        expected = biocircuits.rr_and(0.5, 0.8, 2, 2)
        assert result == pytest.approx(expected)

    def test_rr_and_single_gate(self):
        gate = Gate("rr_and_single", firstInput=0, secondInput=1, firstHill=2, secondHill=2)
        protein_array = [MockProtein(0.5), MockProtein(0.8)]
        result = gate.regFunc(protein_array)
        expected = biocircuits.rr_and_single(0.5, 0.8, 2, 2)
        assert result == pytest.approx(expected)

    def test_ar_and_gate(self):
        gate = Gate("ar_and", firstInput=0, secondInput=1, firstHill=2, secondHill=2)
        protein_array = [MockProtein(0.5), MockProtein(0.8)]
        result = gate.regFunc(protein_array)
        expected = biocircuits.ar_and(0.5, 0.8, 2, 2)
        assert result == pytest.approx(expected)

    def test_ar_or_single_gate(self):
        gate = Gate("ar_or_single", firstInput=0, secondInput=1, firstHill=2, secondHill=2)
        protein_array = [MockProtein(0.5), MockProtein(0.8)]
        result = gate.regFunc(protein_array)
        expected = biocircuits.ar_or_single(0.5, 0.8, 2, 2)
        assert result == pytest.approx(expected)

    def test_act_hill(self):
        gate = Gate("act_hill", firstInput=0, firstHill=3)
        protein_array = [MockProtein(1.2)]
        result = gate.regFunc(protein_array)
        expected = biocircuits.act_hill(1.2, 3)
        assert result == pytest.approx(expected)

    def test_act_hill_mult(self):
        gate = Gate("act_hill_mult", firstInput=0, secondInput=1, firstHill=2, secondHill=4)
        protein_array = [MockProtein(0.7), MockProtein(1.5)]
        result = gate.regFunc(protein_array)
        expected = biocircuits.act_hill(0.7, 2) * biocircuits.act_hill(1.5, 4)
        assert result == pytest.approx(expected)

    def test_rep_hill(self):
        gate = Gate("rep_hill", firstInput=0, firstHill=2)
        protein_array = [MockProtein(0.9)]
        result = gate.regFunc(protein_array)
        expected = biocircuits.rep_hill(0.9, 2)
        assert result == pytest.approx(expected)

    def test_rep_hill_mult(self):
        gate = Gate("rep_hill_mult", firstInput=0, secondInput=1, firstHill=2, secondHill=3)
        protein_array = [MockProtein(0.9), MockProtein(0.4)]
        result = gate.regFunc(protein_array)
        expected = biocircuits.rep_hill(0.9, 2) * biocircuits.rep_hill(0.4, 3)
        assert result == pytest.approx(expected)

    def test_rr_or_and_ar_or(self):
        # rr_or
        gate_rr = Gate("rr_or", firstInput=0, secondInput=1, firstHill=2, secondHill=2)
        protein_array = [MockProtein(0.5), MockProtein(0.8)]
        result_rr = gate_rr.regFunc(protein_array)
        expected_rr = biocircuits.rr_or(0.5, 0.8, 2, 2)
        assert result_rr == pytest.approx(expected_rr)

        # ar_or
        gate_ar = Gate("ar_or", firstInput=0, secondInput=1, firstHill=2, secondHill=2)
        result_ar = gate_ar.regFunc(protein_array)
        expected_ar = biocircuits.ar_or(0.5, 0.8, 2, 2)
        assert result_ar == pytest.approx(expected_ar)

    def test_ar_and_single(self):
        gate = Gate("ar_and_single", firstInput=0, secondInput=1, firstHill=2, secondHill=2)
        protein_array = [MockProtein(0.5), MockProtein(0.8)]
        result = gate.regFunc(protein_array)
        expected = biocircuits.ar_and_single(0.5, 0.8, 2, 2)
        assert result == pytest.approx(expected)

    def test_gate_equality(self):
        g1 = Gate("aa_and", firstInput=0, secondInput=1, firstHill=2, secondHill=2)
        g2 = Gate("aa_and", firstInput=0, secondInput=1, firstHill=2, secondHill=2)
        g3 = Gate("aa_or", firstInput=0, secondInput=1, firstHill=2, secondHill=2)
        assert g1 == g2
        assert not (g1 == g3)

class MockProtein:
    """Mock class for Protein to simulate concentrations"""
    def __init__(self, concentration):
        self.concentration = concentration

    def getConcentration(self):
        return self.concentration