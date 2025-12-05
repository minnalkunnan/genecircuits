import sys
import os
import numpy as np
import pytest
from backend.simulate import run_simulation, x_pulse
from backend.protein import Protein, Gate
import bokeh.plotting as bp
from   bokeh.io import output_file
import bokeh.palettes
from .simulation_test_data import c1_ffl
from backend.ipc_server import run_simulation_handler

# Get the absolute path to this file's directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "simulation_test_data")

DEBUG=False


def test_run_simulation_handler_one_node_input():
    data = {
        "nodes": [{"id": "p1", "label": "A", "type": "protein"}],
        "edges": [],
        "proteins": [
            {"name": "A", "type": "protein", "parameters": {"k": 1.0}}
        ],
        "circuitSettings": {"simulationDuration": 5, "numTimePoints": 100}
    }
    result = run_simulation_handler(data)
    assert "success" in result
    assert result["success"] in (True, "No circuit provided")

def test_run_simulation_handler_two_node_input():
    data = {
    "nodes": [
        {"id": "p1", "type": "custom", "proteinName": "A"},
        {"id": "p2", "type": "custom", "proteinName": "B"}
    ],
    "edges": [
        {"id": "edge-0-1", "type": "promote", "source": "p1", "target": "p2"}
    ],
    "proteins": {
        "A": {
            "label": "A",
            "initialConcentration": 1.0,
            "lossRate": 1,
            "beta": 1,
            "inputs": 1,
            "outputs": 1,
            "inputFunctionType": "steady-state",
            "inputFunctionData": {
                "steadyStateValue": 0,
                "timeStart": 0,
                "timeEnd": 1,
                "pulsePeriod": 1,
                "amplitude": 1,
                "dutyCycle": 0.5
            }
        },
        "B": {
            "label": "B",
            "initialConcentration": 1.2,
            "lossRate": 1,
            "beta": 1,
            "inputs": 1,
            "outputs": 1,
            "inputFunctionType": "steady-state",
            "inputFunctionData": {
                "steadyStateValue": 0,
                "timeStart": 0,
                "timeEnd": 1,
                "pulsePeriod": 1,
                "amplitude": 1,
                "dutyCycle": 0.5
            }
        }
    },
    "circuitSettings": {"simulationDuration": 5, "numTimePoints": 100}
}


    result = run_simulation_handler(data)
    assert "success" in result
    assert result["success"] in (True, "No circuit provided")


def debug_helper(final_concentrations, expected_concentrations):
    if DEBUG:
        print("final vs expected shapes:", final_concentrations.shape, expected_concentrations.shape)
        diff = np.abs(final_concentrations - expected_concentrations)
        print("max diff:", np.max(diff))
        tolerance = 0.1
        bad_idx = np.where(diff > tolerance)
        print("indices exceeding tolerance:", bad_idx)
        print(final_concentrations[bad_idx], expected_concentrations[bad_idx])

def plot_results(t, final_concentrations, title):
    # Create a plot for the results
    p = bp.figure(width=500,
                  height=300,
                  x_axis_label='dimensionless time',
                  y_axis_label='dimensionless concentrations',
                  title=title)

    # Populate glyphs
    colors = bokeh.palettes.d3['Category10'][10]
    for i in range(final_concentrations.shape[1]):
        p.line(t, final_concentrations[:, i],
               line_width=2,
               color=colors[i],
               legend_label=f'Protein {i}')

    # Place the legend
    p.legend.location = 'bottom_right'

    
    output_file(f"{title}.html")
    layout = bokeh.layouts.column(p)
    bokeh.io.show(layout)


def test_c1_ffl_and_short_simulation():
    # Specify expected results. These are based on the ../biocircuits_experimentation/xor_circuit.py script
    output_path = os.path.join(DATA_DIR, "c1_ffl_and_short_results.txt")
    c1_ffl.c1_ffl_and(output_file=output_path) # generate expected results
    expected_short_concentrations = np.loadtxt(os.path.join(DATA_DIR, "c1_ffl_and_short_results.txt"))
    
    # Simulation parameters
    n = 1000
    gamma = 1
    n_xy, n_yz, n_xz = 3, 3, 3
    t_stepdown = 2.0       # Short pulse: x turns off at t=2
    x_0 = 1.0
    duration = 20
    t = np.linspace(0, duration, n)

    # Arguments for x_pulse: (t_0, t_f, tau, x_0, duty_cycle)
    x_args = (0, t_stepdown, t_stepdown, x_0, 1)

    # Define proteins and gates
    proteinArray = [
        Protein(0, "Protein 0", 0.0, 1, [], x_pulse, x_args),
        Protein(1, "Protein 1", 0.0, gamma, [Gate("act_hill", firstInput=0, firstHill=n_xy)]),
        Protein(2, "Protein 2", 0.0, gamma, [Gate("aa_and", firstInput=0, secondInput=1, firstHill=n_xz, secondHill=n_yz)], None, None)
    ]

    # Run simulation
    final_concentrations = run_simulation(t, proteinArray)

    # Plot results
    plot_results(t, final_concentrations, "C1 FFL AND Short Pulse Simulation Results")

    debug_helper(final_concentrations, expected_short_concentrations)

    # Save actual results
    with open(os.path.join(DATA_DIR, "c1_ffl_and_short_results.txt"), "w") as f:
        np.savetxt(f, final_concentrations, comments='')

    # Check against expected results
    assert np.allclose(final_concentrations, expected_short_concentrations, atol=0.1)
    
def test_c1_ffl_and_long_simulation():
    # Specify expected results. These are based on the ../biocircuits_experimentation/xor_circuit.py script
    c1_ffl.c1_ffl_and(output_file=os.path.join(DATA_DIR, "c1_ffl_and_long_results.txt"), t_stepdown=15.0, tau=20, x_0=1.0) # generate expected results
    expected_long_concentrations = np.loadtxt(os.path.join(DATA_DIR, "c1_ffl_and_long_results.txt"))
    
    # Simulation parameters
    n = 1000
    gamma = 1
    n_xy, n_yz, n_xz = 3, 3, 3
    t_stepdown = 15.0       # Long pulse
    x_0 = 1.0
    duration = 20
    t = np.linspace(0, duration, n)

    # Arguments for x_pulse: (t_0, t_f, tau, x_0, duty_cycle)
    x_args = (0, t_stepdown, 20, x_0, 1)

    # Define proteins and gates
    proteinArray = [
        Protein(0, "Protein 0", 0.0, 1, [], x_pulse, x_args),
        Protein(1, "Protein 1", 0.0, gamma, [Gate("act_hill", firstInput=0, firstHill=n_xy)]),
        Protein(2, "Protein 2", 0.0, gamma, [Gate("aa_and", firstInput=0, secondInput=1, firstHill=n_xz, secondHill=n_yz)], None, None)
    ]

    # Run simulation
    final_concentrations = run_simulation(t, proteinArray)

    # Plot results
    plot_results(t, final_concentrations, "C1 FFL AND Long Pulse Simulation Results")

    debug_helper(final_concentrations, expected_long_concentrations)

    # Save actual results
    with open(os.path.join(DATA_DIR, "c1_ffl_and_long_actual_results.log"), "w") as f:
        np.savetxt(f, final_concentrations, comments='')

    # Check against expected results
    assert np.allclose(final_concentrations, expected_long_concentrations, atol=0.1)

def test_xor_simulation():
    # Specify expected results. These are based on the ../biocircuits_experimentation/xor_circuit.py script
    expected_concentrations = np.loadtxt(os.path.join(DATA_DIR, "xor_results.txt"))
    n = 1000
    # Time points
    t = np.linspace(0, 80, n)

    a_args = (0, 40, 30, 2, 0.5)
    b_args = (15, 50, 20, 2, 1)
    proteinArray = [
        Protein(0, "Protein A", 0.0, 0.0, [], x_pulse, a_args), 
        Protein(1, "Protein B", 0.0, 0.00, [],  x_pulse, b_args), 
        Protein(2, "Protein C", 0.0, 0.1, [Gate("aa_and", firstInput=0, secondInput=1)]), 
        Protein(3, "Protein D", 0.0, 0.1, [Gate("aa_or", firstInput=0, secondInput=1)]), 
        Protein(4, "Protein E", 0.0, 0.2, [Gate("ar_and", firstInput=3, secondInput=2, firstHill=2, secondHill=2)])
    ]

    final_concentrations = run_simulation(t, proteinArray)
    
    # write results to file
    with open(os.path.join(DATA_DIR, "xor_actual_results.log"), "w") as f:
        np.savetxt(f, final_concentrations, comments='')
    
    assert np.allclose(final_concentrations, expected_concentrations, atol=1e-5)

def test_xor_shortA_alwaysB():
    expected_concentrations = np.loadtxt(os.path.join(DATA_DIR, "xor_shortA_alwaysB.txt"))
    n = 1000
    t = np.linspace(0, 80, n)
    a_args = (10, 20, 10, 2, 1) # Short pulse from t=10 to t=20
    b_args = (0, 80, 80, 2, 1)  # Always on
    proteinArray = [
        Protein(0, "Protein A", 0.0, 0.0, [], x_pulse, a_args),
        Protein(1, "Protein B", 0.0, 0.0, [], x_pulse, b_args),
        Protein(2, "Protein C", 0.0, 0.1, [Gate("aa_and", firstInput=0, secondInput=1)]),
        Protein(3, "Protein D", 0.0, 0.1, [Gate("aa_or", firstInput=0, secondInput=1)]),
        Protein(4, "Protein E", 0.0, 0.2, [Gate("ar_and", firstInput=3, secondInput=2, firstHill=2, secondHill=2)])
    ]
    final_concentrations = run_simulation(t, proteinArray)

    actual_path = os.path.join(DATA_DIR, "xor_shortA_alwaysB_actual.log")
    with open(actual_path, "w") as f:
        np.savetxt(f, final_concentrations, comments='')
    assert np.allclose(final_concentrations, expected_concentrations, atol=1e-5)

def test_xor_no_overlap():
    expected_concentrations = np.loadtxt(os.path.join(DATA_DIR, "xor_no_overlap.txt"))
    n = 1000
    t = np.linspace(0, 80, n)
    a_args = (0, 20, 20, 2, 1)   # Pulse from t=0 to t=20
    b_args = (30, 50, 20, 2, 1)  # Pulse from t=30 to t=50
    proteinArray = [
        Protein(0, "Protein A", 0.0, 0.0, [], x_pulse, a_args),
        Protein(1, "Protein B", 0.0, 0.0, [], x_pulse, b_args),
        Protein(2, "Protein C", 0.0, 0.1, [Gate("aa_and", firstInput=0, secondInput=1)]),
        Protein(3, "Protein D", 0.0, 0.1, [Gate("aa_or", firstInput=0, secondInput=1)]),
        Protein(4, "Protein E", 0.0, 0.2, [Gate("ar_and", firstInput=3, secondInput=2, firstHill=2, secondHill=2)])
    ]
    final_concentrations = run_simulation(t, proteinArray)

    actual_path = os.path.join(DATA_DIR, "xor_no_overlap_actual.log")
    with open(actual_path, "w") as f:
        np.savetxt(f, final_concentrations, comments='')
    assert np.allclose(final_concentrations, expected_concentrations, atol=1e-5)

def test_xor_both_off():
    expected_concentrations = np.loadtxt(os.path.join(DATA_DIR, "xor_both_off.txt"))
    n = 1000
    t = np.linspace(0, 80, n)
    a_args = (0, 0, 1, 2, 0)     # Always off
    b_args = (0, 0, 1, 2, 0)     # Always off
    proteinArray = [
        Protein(0, "Protein A", 0.0, 0.0, [], x_pulse, a_args),
        Protein(1, "Protein B", 0.0, 0.0, [], x_pulse, b_args),
        Protein(2, "Protein C", 0.0, 0.1, [Gate("aa_and", firstInput=0, secondInput=1)]),
        Protein(3, "Protein D", 0.0, 0.1, [Gate("aa_or", firstInput=0, secondInput=1)]),
        Protein(4, "Protein E", 0.0, 0.2, [Gate("ar_and", firstInput=3, secondInput=2, firstHill=2, secondHill=2)])
    ]
    final_concentrations = run_simulation(t, proteinArray)

    actual_path = os.path.join(DATA_DIR, "xor_both_off_actual.log")
    with open(actual_path, "w") as f:
        np.savetxt(f, final_concentrations, comments='')
    assert np.allclose(final_concentrations, expected_concentrations, atol=1e-5)

def test_xor_diff_amplitudes():
    expected_concentrations = np.loadtxt(os.path.join(DATA_DIR, "xor_diff_amplitudes.txt"))
    n = 1000
    t = np.linspace(0, 80, n)
    a_args = (0, 40, 30, 4, 0.5)  # Amplitude 4
    b_args = (15, 50, 20, 1, 1)   # Amplitude 1
    proteinArray = [
        Protein(0, "Protein A", 0.0, 0.0, [], x_pulse, a_args),
        Protein(1, "Protein B", 0.0, 0.0, [], x_pulse, b_args),
        Protein(2, "Protein C", 0.0, 0.1, [Gate("aa_and", firstInput=0, secondInput=1)]),
        Protein(3, "Protein D", 0.0, 0.1, [Gate("aa_or", firstInput=0, secondInput=1)]),
        Protein(4, "Protein E", 0.0, 0.2, [Gate("ar_and", firstInput=3, secondInput=2, firstHill=2, secondHill=2)])
    ]
    final_concentrations = run_simulation(t, proteinArray)

    actual_path = os.path.join(DATA_DIR, "xor_diff_amplitudes_actual.log")
    with open(actual_path, "w") as f:
        np.savetxt(f, final_concentrations, comments='')
    assert np.allclose(final_concentrations, expected_concentrations, atol=1e-5)

def test_xor_diff_hill():
    expected_concentrations = np.loadtxt(os.path.join(DATA_DIR, "xor_diff_hill.txt"))
    n = 1000
    t = np.linspace(0, 80, n)
    a_args = (0, 40, 30, 2, 0.5)
    b_args = (15, 50, 20, 2, 1)
    proteinArray = [
        Protein(0, "Protein A", 0.0, 0.0, [], x_pulse, a_args),
        Protein(1, "Protein B", 0.0, 0.0, [], x_pulse, b_args),
        Protein(2, "Protein C", 0.0, 0.1, [Gate("aa_and", firstInput=0, secondInput=1, firstHill=3, secondHill=3)]),
        Protein(3, "Protein D", 0.0, 0.1, [Gate("aa_or", firstInput=0, secondInput=1, firstHill=3, secondHill=3)]),
        Protein(4, "Protein E", 0.0, 0.2, [Gate("ar_and", firstInput=3, secondInput=2, firstHill=4, secondHill=4)])
    ]
    final_concentrations = run_simulation(t, proteinArray)

    actual_path = os.path.join(DATA_DIR, "xor_diff_hill_actual.log")
    with open(actual_path, "w") as f:
        np.savetxt(f, final_concentrations, comments='')
    assert np.allclose(final_concentrations, expected_concentrations, atol=1e-5)

def test_xor_diff_degradation():
    expected_concentrations = np.loadtxt(os.path.join(DATA_DIR, "xor_diff_degradation.txt"))
    n = 1000
    t = np.linspace(0, 80, n)
    a_args = (0, 40, 30, 2, 0.5)
    b_args = (15, 50, 20, 2, 1)
    proteinArray = [
        Protein(0, "Protein A", 0.0, 0.0, [], x_pulse, a_args),
        Protein(1, "Protein B", 0.0, 0.0, [], x_pulse, b_args),
        Protein(2, "Protein C", 0.0, 0.5, [Gate("aa_and", firstInput=0, secondInput=1)]),
        Protein(3, "Protein D", 0.0, 0.5, [Gate("aa_or", firstInput=0, secondInput=1)]),
        Protein(4, "Protein E", 0.0, 1.0, [Gate("ar_and", firstInput=3, secondInput=2, firstHill=2, secondHill=2)])
    ]
    final_concentrations = run_simulation(t, proteinArray)

    actual_path = os.path.join(DATA_DIR, "xor_diff_degradation_actual.log")
    with open(actual_path, "w") as f:
        np.savetxt(f, final_concentrations, comments='')
    assert np.allclose(final_concentrations, expected_concentrations, atol=1e-5)

def test_i1_ffl_simulation():
    # Specify expected results. These are based on the ../biocircuits_experimentation/xor_circuit.py script
    expected_path = os.path.join(DATA_DIR, "i1_ffl_results.txt")
    expected_concentrations = np.loadtxt(expected_path)
    n = 200
    gamma = 1
    n_xy, n_yz = 3, 3
    n_xz = 5
    t_stepdown = np.inf
    duration = 10
    x_0 = 1.0
    t = np.linspace(0, duration, n)
    x_args = (0.04, t_stepdown,duration, x_0, 1)

    proteinArray = [Protein(0, "Protein X", 0.0, 0.0, [], x_pulse, x_args), Protein(1, "Protein Y", 0.0, gamma, [Gate("act_hill", firstInput=0, firstHill=n_xy)], None, None, 3), Protein(2, "Protein Z", 0.0, gamma, [Gate("ar_and", firstInput=0, secondInput=1, firstHill=n_xz, secondHill=n_yz)], None, None)]

    final_concentrations = run_simulation(t, proteinArray)
    plot_results(t, final_concentrations, "I1 FFL AND Simulation Results")

    # write out to file
    actual_path = os.path.join(DATA_DIR, "i1_ffl_actual_results.log")
    with open(actual_path, "w") as f:
        np.savetxt(f, final_concentrations, comments='')
    assert np.allclose(final_concentrations, expected_concentrations, atol=1e-1) # Tolerance is 0.1

def test_repressilator_no_repression():
    n = 500
    gamma = 1
    beta_all = 5
    duration = 10
    t = np.linspace(0, duration, n)
    x0 = np.array([2, 2, 2])

    proteinArray = [
        Protein(0, "Protein 1", x0[0], gamma, [], None, None, beta_all),
        Protein(1, "Protein 2", x0[1], gamma, [], None, None, beta_all),
        Protein(2, "Protein 3", x0[2], gamma, [], None, None, beta_all),
    ]

    final_concentrations = run_simulation(t, proteinArray)

    # All proteins should decay toward ~0
    assert np.all(final_concentrations[-1] < 1e-3)

def test_repressilator():
    # Specify expected results. These are based on the ../biocircuits_experimentation/xor_circuit.py script
    expected_path = os.path.join(DATA_DIR, "repressilator_results.txt")
    expected_concentrations = np.loadtxt(expected_path)
    n = 1000
    gamma = 1
    n_all = 3
    beta_all = 5
    duration = 10
    x0 = np.array([1, 1, 1.2])
    t = np.linspace(0, duration, n)

    proteinArray = [Protein(0, "Protein 1", x0[0], gamma, [Gate("rep_hill", firstInput=2, firstHill=n_all)], None, None, beta_all), Protein(1, "Protein 2", x0[1], gamma, [Gate("rep_hill", firstInput=0, firstHill=n_all)], None, None, beta_all), Protein(2, "Protein 3", x0[2], gamma, [Gate("rep_hill", firstInput=1, firstHill=n_all)], None, None, beta_all)]

    final_concentrations = run_simulation(t, proteinArray)
    plot_results(t, final_concentrations, "Repressilator Simulation Results")

    # write out to file
    actual_path = os.path.join(DATA_DIR, "repressilator_actual_results.log")
    with open(actual_path, "w") as f:
        np.savetxt(f, final_concentrations, comments='')
    assert np.allclose(final_concentrations, expected_concentrations, atol=1e-12)
    
def test_repressilator_self_repress():
    expected = np.loadtxt("simulation_test_data/repressilator_self_repress_results.txt")

    n = 1000
    gamma = 1
    n_all = 3
    beta_all = 5
    duration = 10
    t = np.linspace(0, duration, n)
    x0 = np.array([1, 1, 1.2])

    # Protein array with self-repression on Protein 2
    proteinArray = [
        Protein(0, "Protein 1", x0[0], gamma, [Gate("rep_hill", firstInput=2, firstHill=n_all)], None, None, beta_all),
        Protein(1, "Protein 2", x0[1], gamma, [
            Gate("rep_hill_mult", firstInput=0, secondInput=1, firstHill=n_all, secondHill=2)
        ], None, None, beta_all),
        Protein(2, "Protein 3", x0[2], gamma, [Gate("rep_hill", firstInput=1, firstHill=n_all)], None, None, beta_all)
    ]

    final_concentrations = run_simulation(t, proteinArray)
    plot_results(t, final_concentrations, "Repressilator with Self-Repression")

    with open("simulation_test_data/repressilator_self_repress_actual_results.log", "w") as f:
        np.savetxt(f, final_concentrations, comments='')
    assert np.allclose(final_concentrations, expected, atol=1e-12)

def test_toggle_switch():
    n = 600
    duration = 30
    t = np.linspace(0, duration, n)

    gamma = 1.0
    hill_n = 3
    beta = 1.5  

    proteins = [
        Protein(0, "A", 1.0, gamma, [Gate("rep_hill", firstInput=1, firstHill=hill_n)], None, None, beta),
        Protein(1, "B", 1.2, gamma, [Gate("rep_hill", firstInput=0, firstHill=hill_n)], None, None, beta),
    ]

    conc = run_simulation(t, proteins)
    plot_results(t, conc, "Toggle Switch Simulation Results")
    assert conc.shape == (n, 2)
    assert np.all(np.isfinite(conc))
    assert conc.min() > -1e-9
    assert conc[-1, 1] > conc[-1, 0]  # Protein B > Protein A at the end


def test_toggle_switch_reference():
    """Test toggle switch against generated reference data"""
    expected_path = os.path.join(DATA_DIR, "toggle_switch_results.txt")
    expected_concentrations = np.loadtxt(expected_path)
    
    # Same parameters as in toggle_switch.py
    n = 1000
    duration = 10
    t = np.linspace(0, duration, n)
    
    gamma = 1.0
    hill_n = 3
    beta = 1.0  # Match toggle_switch.py parameters
    
    proteins = [
        Protein(0, "A", 1.0, gamma, [Gate("rep_hill", firstInput=1, firstHill=hill_n)], None, None, beta),
        Protein(1, "B", 1.2, gamma, [Gate("rep_hill", firstInput=0, firstHill=hill_n)], None, None, beta),
    ]
    
    conc = run_simulation(t, proteins)
    assert np.allclose(conc, expected_concentrations, atol=1e-6)


def test_toggle_switch_opposite_concentrations():
    n = 600
    duration = 30
    t = np.linspace(0, duration, n)

    gamma = 1.0
    hill_n = 3
    beta = 1.5  

    proteins = [
        Protein(0, "A", 1.2, gamma, [Gate("rep_hill", firstInput=1, firstHill=hill_n)], None, None, beta),
        Protein(1, "B", 1.0, gamma, [Gate("rep_hill", firstInput=0, firstHill=hill_n)], None, None, beta),
    ]

    conc = run_simulation(t, proteins)
    plot_results(t, conc, "Toggle Switch Simulation Results for Opposite Concentrations")
    assert conc.shape == (n, 2)
    assert np.all(np.isfinite(conc))
    assert conc.min() > -1e-9
    assert conc[-1, 0] > conc[-1, 1]

def test_toggle_switch_equal_concentrations():
    n = 600
    duration = 30
    t = np.linspace(0, duration, n)

    gamma = 1.0
    hill_n = 3
    beta = 1.5  

    proteins = [
        Protein(0, "A", 1.2, gamma, [Gate("rep_hill", firstInput=1, firstHill=hill_n)], None, None, beta),
        Protein(1, "B", 1.2, gamma, [Gate("rep_hill", firstInput=0, firstHill=hill_n)], None, None, beta),
    ]

    conc = run_simulation(t, proteins)
    plot_results(t, conc, "Toggle Switch Simulation Results for Equal Concentrations")
    assert conc.shape == (n, 2)
    assert np.all(np.isfinite(conc))
    assert conc.min() > -1e-9
    assert abs(conc[-1, 0] - conc[-1, 1]) < 1e-3


def test_toggle_switch_small_hill_coefficient():
    n = 600
    duration = 30
    t = np.linspace(0, duration, n)

    gamma = 1.0
    hill_n = 0.5
    beta = 1.5  

    proteins = [
        Protein(0, "A", 1.2, gamma, [Gate("rep_hill", firstInput=1, firstHill=hill_n)], None, None, beta),
        Protein(1, "B", 1.0, gamma, [Gate("rep_hill", firstInput=0, firstHill=hill_n)], None, None, beta),
    ]

    conc = run_simulation(t, proteins)
    plot_results(t, conc, "Toggle Switch Simulation Results for Small Hill Coefficient")
    assert conc.shape == (n, 2)
    assert np.all(np.isfinite(conc))
    assert conc.min() > -1e-9
    assert abs(conc[-1, 0] - conc[-1, 1]) < 1

def test_toggle_switch_unequal_degradation_rates():
    n = 600
    duration = 30
    t = np.linspace(0, duration, n)

    gamma = 1.0
    hill_n = 0.5
    beta = 1.5  

    proteins = [
        Protein(0, "A", 1.2, 0.5, [Gate("rep_hill", firstInput=1, firstHill=hill_n)], None, None, beta),
        Protein(1, "B", 1.0, 1.0, [Gate("rep_hill", firstInput=0, firstHill=hill_n)], None, None, beta),
    ]

    conc = run_simulation(t, proteins)
    plot_results(t, conc, "Toggle Switch Simulation Results for Unequal Degradation Rates")
    assert conc.shape == (n, 2)
    assert np.all(np.isfinite(conc))
    assert conc.min() > -1e-9
    assert conc[-1, 0] > conc[-1, 1]


def test_toggle_switch_unequal_production_rates():
    n = 600
    duration = 30
    t = np.linspace(0, duration, n)

    gamma = 1.0
    hill_n = 0.5
    beta = 1.5  

    proteins = [
        Protein(0, "A", 1.2, gamma, [Gate("rep_hill", firstInput=1, firstHill=hill_n)], None, None, beta=3.0),
        Protein(1, "B", 1.0, gamma, [Gate("rep_hill", firstInput=0, firstHill=hill_n)], None, None, beta=1.0),
    ]

    conc = run_simulation(t, proteins)
    plot_results(t, conc, "Toggle Switch Simulation Results for Unequal Production Rates")
    assert conc.shape == (n, 2)
    assert np.all(np.isfinite(conc))
    assert conc.min() > -1e-9
    assert conc[-1, 0] > conc[-1, 1]


def test_repressilator_self_repress():
    expected_path = os.path.join(DATA_DIR, "repressilator_self_repress_results.txt")
    expected = np.loadtxt(expected_path)

    n = 1000
    gamma = 1
    n_all = 3
    beta_all = 5
    duration = 10
    t = np.linspace(0, duration, n)
    x0 = np.array([1, 1, 1.2])

    # Protein array with self-repression on Protein 2
    proteinArray = [
        Protein(0, "Protein 1", x0[0], gamma, [Gate("rep_hill", firstInput=2, firstHill=n_all)], None, None, beta_all),
        Protein(1, "Protein 2", x0[1], gamma, [
            Gate("rep_hill_mult", firstInput=0, secondInput=1, firstHill=n_all, secondHill=2)
        ], None, None, beta_all),
        Protein(2, "Protein 3", x0[2], gamma, [Gate("rep_hill", firstInput=1, firstHill=n_all)], None, None, beta_all)
    ]

    final_concentrations = run_simulation(t, proteinArray)
    plot_results(t, final_concentrations, "Repressilator with Self-Repression")

    actual_path = os.path.join(DATA_DIR, "repressilator_self_repress_actual_results.log")
    with open(actual_path, "w") as f:
        np.savetxt(f, final_concentrations, comments='')
    assert np.allclose(final_concentrations, expected, atol=1e-12)


def test_c1_ffl_or_simulation():
    # Specify expected results. These are based on the ../biocircuits_experimentation/xor_circuit.py script
    expected_path = os.path.join(DATA_DIR, "c1_ffl_or_results.txt")
    c1_ffl.c1_ffl_or(output_file=expected_path)
    expected_concentrations = np.loadtxt(expected_path)
    n = 200
    gamma = 1
    n_xy, n_yz = 3, 3
    n_xz = 5
    t_stepdown = np.inf
    duration = 10
    x_0 = 1.0
    t = np.linspace(0, duration, n)
    x_args = (0.04, t_stepdown,duration, x_0, 1)

    proteinArray = [Protein(0, "Protein X", 0.0, 0.0, [], x_pulse, x_args), Protein(1, "Protein Y", 0.0, gamma, [Gate("act_hill", firstInput=0, firstHill=n_xy)], None, None, 3), Protein(2, "Protein Z", 0.0, gamma, [Gate("aa_or", firstInput=0, secondInput=1, firstHill=n_xz, secondHill=n_yz)], None, None)]

    final_concentrations = run_simulation(t, proteinArray)
    plot_results(t, final_concentrations, "C1 FFL OR Simulation Results")

    # write out to file
    actual_path = os.path.join(DATA_DIR, "c1_ffl_or_actual_results.log")
    with open(actual_path, "w") as f:
        np.savetxt(f, final_concentrations, comments='')
    assert np.allclose(final_concentrations, expected_concentrations, atol=1e-1) # Tolerance is 0.1

def test_c1_ffl_and_or_simulation():
    # Specify expected results. These are based on the ../biocircuits_experimentation/xor_circuit.py script
    expected_path = os.path.join(DATA_DIR, "c1_ffl_and_or_results.txt")
    c1_ffl.c1_ffl_and_or(output_file=expected_path)
    expected_concentrations = np.loadtxt(expected_path)
    
    # Simulation parameters
    n = 1000
    gamma = 1
    n_xy, n_yz, n_xz = 4, 4, 4
    t_stepdown = 0.5
    x_0 = 1.0
    duration = 20
    t = np.linspace(0, duration, n)

    # Arguments for x_pulse: (t_0, t_f, tau, x_0, duty_cycle)
    x_args = (0, t_stepdown, t_stepdown, x_0, 1)

    proteinArray = [Protein(0, "Protein X", 0.0, 0.0, [], x_pulse, x_args), Protein(1, "Protein Y", 0.0, gamma, [Gate("act_hill", firstInput=0, firstHill=n_xy)], None, None, 3), Protein(2, "Protein Z", 0.0, gamma, [Gate("aa_and", firstInput=0, secondInput=1, firstHill=n_xz, secondHill=n_yz), Gate("aa_or", firstInput=0, secondInput=1, firstHill=n_xz, secondHill=n_yz)], None, None)]

    final_concentrations = run_simulation(t, proteinArray)
    plot_results(t, final_concentrations, "C1 FFL AND OR Simulation Results")
    
    debug_helper(final_concentrations, expected_concentrations)

    # write out to file
    actual_path = os.path.join(DATA_DIR, "c1_ffl_and_or_actual_results.log")
    with open(actual_path, "w") as f:
        np.savetxt(f, final_concentrations, comments='')
    assert np.allclose(final_concentrations, expected_concentrations, atol=2e-1) # Tolerance is 0.2 since harder to exactly simulate using ffl_plot


# TODO: handle command line args, to run individual tests if desired
def main():
    print("Running all test cases...")
    pytest.main(["-v", 
                  "test_simulator.py::test_c1_ffl_and_short_simulation",
                  "test_simulator.py::test_c1_ffl_and_long_simulation", 
                  "test_simulator.py::test_xor_simulation",
                  "test_simulator.py::test_i1_ffl_simulation",
                  "test_simulator.py::test_repressilator", 
                  "test_simulator.py::test_toggle_switch",
                  "test_simulator.py::test_toggle_switch_opposite_concentrations",
                  "test_simulator.py::test_toggle_switch_equal_concentrations",
                  "test_simulator.py::test_toggle_switch_small_hill_coefficient",
                  "test_simulator.py::test_toggle_switch_unequal_degradation_rates",
                  "test_simulator.py::test_toggle_switch_unequal_production_rates",
                  "test_simulator.py::test_repressilator_self_repress",
                  "test_simulator.py::test_c1_ffl_or_simulation",
                  "test_simulator.py::test_c1_ffl_and_or_simulation",
                  "test_simulator.py::test_run_simulation_handler_one_node_input",
                  "test_simulator.py::test_run_simulation_handler_two_nodes_input"])
# Run the script
if __name__ == '__main__':
    main()
