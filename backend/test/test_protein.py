import sys
import os
import pytest
import numpy as np
from backend.protein import Protein, Gate


class TestProtein:
    """Unit tests for the Protein class"""
    
    def test_protein_initialization_basic(self):
        protein = Protein(0, "TestProtein", 1.0, 0.1, [])
        
        assert protein.getID() == 0
        assert protein.getName() == "TestProtein"
        assert protein.getInternalConcentration() == 1.0
        assert protein.mDegradation == 0.1
        assert protein.mBeta == 1  # this is the default value
        assert protein.mGates == []
    
    def test_protein_initialization_with_gates(self):
        gate = Gate("act_hill", firstInput=0, firstHill=2)
        protein = Protein(1, "RegulatedProtein", 2.0, 0.2, [gate], beta=2.5)
        
        assert protein.getID() == 1
        assert len(protein.mGates) == 1
        assert protein.mGates[0] == gate
        assert protein.mBeta == 2.5
    
    def test_protein_external_concentration_no_function(self):
        protein = Protein(0, "Test", 1.0, 0.1, [])
        protein.setExternalConcentration(5.0)
        assert protein.getExternalConcentration() == 0
    
    def test_protein_external_concentration_with_function(self):
        def test_func(t, amplitude, offset):
            return amplitude * t + offset
        
        protein = Protein(0, "Test", 1.0, 0.1, [], test_func, (2.0, 1.0))
        protein.setExternalConcentration(3.0)
        assert protein.getExternalConcentration() == 7.0  # 2*3 + 1
    
    def test_protein_concentration_calculation(self):
        protein = Protein(0, "Test", 1.5, 0.1, [])
        
        # Simulate setting external concentration directly
        protein.mExternalConc = 0.5
        assert protein.getConcentration() == 2.0  # 1.5 + 0.5
    
    def test_protein_set_internal_concentration(self):
        protein = Protein(0, "Test", 1.0, 0.1, [])
        protein.setInternalConcentration(3.0)
        assert protein.getInternalConcentration() == 3.0
    
    def test_protein_calc_prod_rate_no_gates(self):
        protein = Protein(0, "Test", 2.0, 0.1, [], beta=1.0)
        protein_array = [protein]
        
        rate = protein.calcProdRate(protein_array)
        expected_rate = -0.1 * 2.0  # only degradation
        assert rate == pytest.approx(expected_rate)
    
    def test_protein_calc_prod_rate_with_gates(self):
        # Create a mock gate that just always returns 0.5
        class MockGate:
            def regFunc(self, protein_array):
                return 0.5
        
        mock_gate = MockGate()
        protein = Protein(0, "Test", 2.0, 0.1, [mock_gate], beta=2.0)
        protein_array = [protein]
        
        rate = protein.calcProdRate(protein_array)
        # Production: 2.0 * 0.5 = 1.0
        # Degradation: 0.1 * 2.0 = 0.2
        expected_rate = 1.0 - 0.2
        assert rate == pytest.approx(expected_rate)
    
    def test_protein_calc_prod_rate_multiple_gates(self):
        class MockGate:
            def __init__(self, value):
                self.value = value
            def regFunc(self, protein_array):
                return self.value
        
        gate1 = MockGate(0.3)
        gate2 = MockGate(0.2)
        protein = Protein(0, "Test", 2.0, 0.1, [gate1, gate2], beta=2.0)
        protein_array = [protein]
        
        rate = protein.calcProdRate(protein_array)
        # Production: 2.0 * (0.3 + 0.2) = 1.0
        # Degradation: 0.1 * 2.0 = 0.2
        expected_rate = 1.0 - 0.2
        assert rate == pytest.approx(expected_rate)
    
    def test_protein_equality(self):
        gate1 = Gate("act_hill", firstInput=0, firstHill=2)
        gate2 = Gate("act_hill", firstInput=0, firstHill=2)
        
        def test_func(t, x):
            return t * x
        
        protein1 = Protein(0, "Test", 1.0, 0.1, [gate1], test_func, (2,))
        protein2 = Protein(0, "Test", 1.0, 0.1, [gate2], test_func, (2,))
        protein3 = Protein(1, "Test", 1.0, 0.1, [gate1], test_func, (2,))
        protein4 = Protein(0, "Different", 1.0, 0.1, [gate1], test_func, (2,))
        
        assert protein1 == protein2
        assert protein1 != protein3
        assert protein1 != protein4
        assert protein1 != "not_a_protein"
    
    def test_protein_with_none_external_function_args(self):
        def test_func(t):
            return t * 2
        
        protein = Protein(0, "Test", 1.0, 0.1, [], test_func, None)
        # Should not crash when setting external concentration
        protein.setExternalConcentration(2.0)
    
    def test_protein_string_representation(self):
        protein = Protein(0, "TestProtein", 1.0, 0.1, [])
        # Basic check that str() works without error
        str_repr = str(protein)
        assert "Protein" in str_repr or "TestProtein" in str_repr


class TestProteinEdgeCases:
    """Test edge cases and error conditions for Protein class"""
    
    def test_protein_zero_degradation(self):
        protein = Protein(0, "Test", 1.0, 0.0, [], beta=1.0)
        protein_array = [protein]
        
        rate = protein.calcProdRate(protein_array)
        assert rate == 0.0  # no production from gates, no degradation
    
    def test_protein_negative_initial_concentration(self):
        protein = Protein(0, "Test", -1.0, 0.1, [])
        assert protein.getInternalConcentration() == -1.0
    
    def test_protein_high_beta_value(self):
        class MockGate:
            def regFunc(self, protein_array):
                return 0.1
        
        protein = Protein(0, "Test", 1.0, 0.1, [MockGate()], beta=100.0)
        protein_array = [protein]
        
        rate = protein.calcProdRate(protein_array)
        # Production: 100.0 * 0.1 = 10.0
        # Degradation: 0.1 * 1.0 = 0.1
        expected_rate = 10.0 - 0.1
        assert rate == pytest.approx(expected_rate)
    
    def test_protein_empty_gate_list(self):
        protein = Protein(0, "Test", 1.0, 0.1, [])
        protein_array = [protein]
        
        rate = protein.calcProdRate(protein_array)
        assert rate == pytest.approx(-0.1)  # only degradation