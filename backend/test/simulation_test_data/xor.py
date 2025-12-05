# based on code from http://be150.caltech.edu/2019/handouts/02_intro_to_python_for_biological_circuits.html 
import numpy as np
import scipy.integrate
import biocircuits
import bokeh.application
from   bokeh.io import output_file
import bokeh.plotting as bp

bokeh.io.output_notebook()

def x_pulse(t, t_0, t_f, tau, x_0, duty_cycle):
    """
    Returns x value for a pulse beginning at t = t_0 with a period of tau. 
    duty_cycle is the fraction of the period that the pulse is on. This should be between 0 and 1.
    x_0 is the amplitude of the pulse.
    t_f is when the pulse should stop.
    """
    # Find how far into the current period we are. Use floor to support floating point values.
    t_since_period_start = t - t_0 - ((t - t_0) // (tau))*(tau)

    return np.logical_and(t >= t_0, np.logical_and(t <= t_f, t_since_period_start <= tau*duty_cycle)) * x_0

"""
Logical expression: OUT = NOT (A AND B) AND (D OR E) = XOR(A,B)
Simple circuit layout: 

A ----> 
        AND(C) ---|
B ----> 
                    AND(E)
A ----> 
        OR(D) --->
B ---->

"""

def generate_default_xor():
    n = 1000
    t = np.linspace(0, 80, n)
    abcde_0 = np.array([0.0, 0.0, 0.0, 0.0, 0.0])
    hill_abcd = (1, 1, 2, 2) # a and b are the inputs
    loss_cde = (0.1, 0.1, 0.2)
    args = (hill_abcd, loss_cde)

    def xor(abcde, t, hill_abcd, loss_cde):
        a = x_pulse(t, 0, 40, 30, 2, 0.5) # Pulse from t=0 to t=40 with period 30 and duty cycle 0.5
        b = x_pulse(t, 15, 50, 20, 2, 1) # Pulse from t=15 to t=50 with period 20 and duty cycle 1
        _, _, c, d, e = abcde
        n_a, n_b, n_c, n_d = hill_abcd
        l_c, l_d, l_e = loss_cde
        dc_dt = biocircuits.aa_and(a, b, n_a, n_b) - l_c*c
        dd_dt = biocircuits.aa_or(a, b, n_a, n_b) - l_d*d
        de_dt = biocircuits.ar_and(d, c, n_d, n_c) - l_e*e
        return np.array([0.0, 0.0, dc_dt, dd_dt, de_dt])

    abcde_concentrations = scipy.integrate.odeint(xor, abcde_0, t, args=args)
    # Add a and b values to the concentrations
    a_vals = x_pulse(t, 0, 40, 30, 2, 0.5)
    b_vals = x_pulse(t, 15, 50, 20, 2, 1)
    # Combine values into a single array
    abcde_concentrations[:, 0] += a_vals
    abcde_concentrations[:, 1] += b_vals
    # log concentrations
    with open("xor_results.txt", "w") as f:
        np.savetxt(f, abcde_concentrations, comments='')

def generate_xor_shortA_alwaysB():
    n = 1000
    t = np.linspace(0, 80, n)
    abcde_0 = np.array([0.0, 0.0, 0.0, 0.0, 0.0])
    hill_abcd = (1, 1, 2, 2)
    loss_cde = (0.1, 0.1, 0.2)
    args = (hill_abcd, loss_cde)

    def xor(abcde, t, hill_abcd, loss_cde):
        a = x_pulse(t, 10, 20, 10, 2, 1) # Short pulse from t=10 to t=20
        b = x_pulse(t, 0, 80, 80, 2, 1)  # Always on
        _, _, c, d, e = abcde
        n_a, n_b, n_c, n_d = hill_abcd
        l_c, l_d, l_e = loss_cde
        dc_dt = biocircuits.aa_and(a, b, n_a, n_b) - l_c*c
        dd_dt = biocircuits.aa_or(a, b, n_a, n_b) - l_d*d
        de_dt = biocircuits.ar_and(d, c, n_d, n_c) - l_e*e
        return np.array([0.0, 0.0, dc_dt, dd_dt, de_dt])

    abcde_concentrations = scipy.integrate.odeint(xor, abcde_0, t, args=args)
    a_vals = x_pulse(t, 10, 20, 10, 2, 1)
    b_vals = x_pulse(t, 0, 80, 80, 2, 1)
    abcde_concentrations[:, 0] += a_vals
    abcde_concentrations[:, 1] += b_vals

    with open("xor_shortA_alwaysB.txt", "w") as f:
        np.savetxt(f, abcde_concentrations, comments='')

def generate_xor_no_overlap():
    n = 1000
    t = np.linspace(0, 80, n)
    abcde_0 = np.array([0.0, 0.0, 0.0, 0.0, 0.0])
    hill_abcd = (1, 1, 2, 2)
    loss_cde = (0.1, 0.1, 0.2)
    args = (hill_abcd, loss_cde)

    def xor(abcde, t, hill_abcd, loss_cde):
        a = x_pulse(t, 0, 20, 20, 2, 1)   # Pulse from t=0 to t=20
        b = x_pulse(t, 30, 50, 20, 2, 1)  # Pulse from t=30 to t=50
        _, _, c, d, e = abcde
        n_a, n_b, n_c, n_d = hill_abcd
        l_c, l_d, l_e = loss_cde
        dc_dt = biocircuits.aa_and(a, b, n_a, n_b) - l_c*c
        dd_dt = biocircuits.aa_or(a, b, n_a, n_b) - l_d*d
        de_dt = biocircuits.ar_and(d, c, n_d, n_c) - l_e*e
        return np.array([0.0, 0.0, dc_dt, dd_dt, de_dt])

    abcde_concentrations = scipy.integrate.odeint(xor, abcde_0, t, args=args)
    a_vals = x_pulse(t, 0, 20, 20, 2, 1)   # Pulse from t=0 to t=20
    b_vals = x_pulse(t, 30, 50, 20, 2, 1)  # Pulse from t=30 to t=50
    abcde_concentrations[:, 0] += a_vals
    abcde_concentrations[:, 1] += b_vals

    with open("xor_no_overlap.txt", "w") as f:
        np.savetxt(f, abcde_concentrations, comments='')

def generate_xor_both_off():
    n = 1000
    t = np.linspace(0, 80, n)
    abcde_0 = np.array([0.0, 0.0, 0.0, 0.0, 0.0])
    hill_abcd = (1, 1, 2, 2)
    loss_cde = (0.1, 0.1, 0.2)
    args = (hill_abcd, loss_cde)

    def xor(abcde, t, hill_abcd, loss_cde):
        a = x_pulse(t, 0, 0, 1, 2, 0)     # Always off
        b = x_pulse(t, 0, 0, 1, 2, 0)     # Always off
        _, _, c, d, e = abcde
        n_a, n_b, n_c, n_d = hill_abcd
        l_c, l_d, l_e = loss_cde
        dc_dt = biocircuits.aa_and(a, b, n_a, n_b) - l_c*c
        dd_dt = biocircuits.aa_or(a, b, n_a, n_b) - l_d*d
        de_dt = biocircuits.ar_and(d, c, n_d, n_c) - l_e*e
        return np.array([0.0, 0.0, dc_dt, dd_dt, de_dt])

    abcde_concentrations = scipy.integrate.odeint(xor, abcde_0, t, args=args)
    a_vals = x_pulse(t, 0, 0, 1, 2, 0)     # Always off
    b_vals = x_pulse(t, 0, 0, 1, 2, 0)     # Always off
    abcde_concentrations[:, 0] += a_vals
    abcde_concentrations[:, 1] += b_vals

    with open("xor_both_off.txt", "w") as f:
        np.savetxt(f, abcde_concentrations, comments='')

def generate_xor_diff_amplitudes():
    n = 1000
    t = np.linspace(0, 80, n)
    abcde_0 = np.array([0.0, 0.0, 0.0, 0.0, 0.0])
    hill_abcd = (1, 1, 2, 2)
    loss_cde = (0.1, 0.1, 0.2)
    args = (hill_abcd, loss_cde)

    def xor(abcde, t, hill_abcd, loss_cde):
        a = x_pulse(t, 0, 40, 30, 4, 0.5) # Amplitude 4 (was 2)
        b = x_pulse(t, 15, 50, 20, 1, 1)  # Amplitude 1 (was 2)
        _, _, c, d, e = abcde
        n_a, n_b, n_c, n_d = hill_abcd
        l_c, l_d, l_e = loss_cde
        dc_dt = biocircuits.aa_and(a, b, n_a, n_b) - l_c*c
        dd_dt = biocircuits.aa_or(a, b, n_a, n_b) - l_d*d
        de_dt = biocircuits.ar_and(d, c, n_d, n_c) - l_e*e
        return np.array([0.0, 0.0, dc_dt, dd_dt, de_dt])

    abcde_concentrations = scipy.integrate.odeint(xor, abcde_0, t, args=args)
    a_vals = x_pulse(t, 0, 40, 30, 4, 0.5)
    b_vals = x_pulse(t, 15, 50, 20, 1, 1)
    abcde_concentrations[:, 0] += a_vals
    abcde_concentrations[:, 1] += b_vals

    with open("xor_diff_amplitudes.txt", "w") as f:
        np.savetxt(f, abcde_concentrations, comments='')

def generate_xor_diff_hill():
    n = 1000
    t = np.linspace(0, 80, n)
    abcde_0 = np.array([0.0, 0.0, 0.0, 0.0, 0.0])
    hill_abcd = (3, 3, 4, 4) # Higher Hill coefficients
    loss_cde = (0.1, 0.1, 0.2)
    args = (hill_abcd, loss_cde)

    def xor(abcde, t, hill_abcd, loss_cde):
        a = x_pulse(t, 0, 40, 30, 2, 0.5)
        b = x_pulse(t, 15, 50, 20, 2, 1)
        _, _, c, d, e = abcde
        n_a, n_b, n_c, n_d = hill_abcd
        l_c, l_d, l_e = loss_cde
        dc_dt = biocircuits.aa_and(a, b, n_a, n_b) - l_c*c
        dd_dt = biocircuits.aa_or(a, b, n_a, n_b) - l_d*d
        de_dt = biocircuits.ar_and(d, c, n_d, n_c) - l_e*e
        return np.array([0.0, 0.0, dc_dt, dd_dt, de_dt])

    abcde_concentrations = scipy.integrate.odeint(xor, abcde_0, t, args=args)
    a_vals = x_pulse(t, 0, 40, 30, 2, 0.5)
    b_vals = x_pulse(t, 15, 50, 20, 2, 1)
    abcde_concentrations[:, 0] += a_vals
    abcde_concentrations[:, 1] += b_vals

    with open("xor_diff_hill.txt", "w") as f:
        np.savetxt(f, abcde_concentrations, comments='')

def generate_xor_diff_degradation():
    n = 1000
    t = np.linspace(0, 80, n)
    abcde_0 = np.array([0.0, 0.0, 0.0, 0.0, 0.0])
    hill_abcd = (1, 1, 2, 2)
    loss_cde = (0.5, 0.5, 1.0) # Higher degradation rates
    args = (hill_abcd, loss_cde)

    def xor(abcde, t, hill_abcd, loss_cde):
        a = x_pulse(t, 0, 40, 30, 2, 0.5)
        b = x_pulse(t, 15, 50, 20, 2, 1)
        _, _, c, d, e = abcde
        n_a, n_b, n_c, n_d = hill_abcd
        l_c, l_d, l_e = loss_cde
        dc_dt = biocircuits.aa_and(a, b, n_a, n_b) - l_c*c
        dd_dt = biocircuits.aa_or(a, b, n_a, n_b) - l_d*d
        de_dt = biocircuits.ar_and(d, c, n_d, n_c) - l_e*e
        return np.array([0.0, 0.0, dc_dt, dd_dt, de_dt])

    abcde_concentrations = scipy.integrate.odeint(xor, abcde_0, t, args=args)
    a_vals = x_pulse(t, 0, 40, 30, 2, 0.5)
    b_vals = x_pulse(t, 15, 50, 20, 2, 1)
    abcde_concentrations[:, 0] += a_vals
    abcde_concentrations[:, 1] += b_vals

    with open("xor_diff_degradation.txt", "w") as f:
        np.savetxt(f, abcde_concentrations, comments='')


# ====================================================================================

if __name__ == "__main__":
    generate_default_xor()
    generate_xor_shortA_alwaysB()
    generate_xor_no_overlap()
    generate_xor_both_off()
    generate_xor_diff_amplitudes()
    generate_xor_diff_hill()
    generate_xor_diff_degradation()