# based on code from http://be150.caltech.edu/2019/handouts/02_intro_to_python_for_biological_circuits.html 
# Results should look similar to the graph here: https://biocircuits.github.io/chapters/04_ffls.html#:~:text=gamma%20%3D%201-,kappa,-%3D%201%0An_xy 
import biocircuits.apps
import bokeh.io
import numpy as np
from scipy.interpolate import interp1d

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


def c1_ffl_and(output_file, n_xy=3, n_yz=3, n_xz=3, gamma=1, beta=1, kappa=1, n=1000, t_stepdown=2.0, tau=2.0, x_0=1.0, duty=1):
    """
    Generates expected C1 FFL AND circuit concentrations in a file given by output_file. T
    the default values for the arguments correspond to a short pulse C1 FFL AND circuit.
    """
    x_args = (0, t_stepdown, tau, x_0, duty)

    # Time points
    t = np.linspace(0, 20, n)

    # Short pulse
    p, cds, cds_x = biocircuits.apps.plot_ffl(
        beta,
        gamma,
        kappa,
        n_xy,
        n_xz,
        n_yz,
        ffl="c1",
        logic="and",
        t=t,
        t_step_down=t_stepdown,      # Short pulse: x turns off at t=2
        normalized=False,
    )

    # Uncomment to see plot
    # colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"]
    # p.line(
    #     t, 1 - np.exp(-t), line_width=2, color=colors[4], legend_label="unregulated",
    # )
    # bokeh.io.show(p)

    y = cds.data["y"][1:] # first element is redundant. size should be 200
    z = cds.data["z"][1:] # first element is redundant. size should be 200

    x_vals = x_pulse(t, *x_args)
    
    # Create list of tuples (each row = [x, y, z])
    xyz_concentrations = list(zip(x_vals, y, z))

    # Save to file as text
    np.savetxt(output_file, xyz_concentrations, comments='')

def c1_ffl_or(output_file):  
    # Parameter values
    beta = 3
    gamma = 1
    kappa = 1 # We will not use kappa, so set it to 1
    n_xy, n_yz = 3, 3
    n_xz = 5
    t = np.linspace(0, 10, 200)

    # Set up and solve
    p, cds, cds_x = biocircuits.apps.plot_ffl(
        beta,
        gamma,
        kappa,
        n_xy,
        n_xz,
        n_yz,
        ffl="c1",
        logic="or",
        t=t,
        t_step_down=np.inf,
        normalized=False,
    )

    # Uncomment to see plot
    # colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"]
    # p.line(
    #     t, 1 - np.exp(-t), line_width=2, color=colors[4], legend_label="unregulated",
    # )

    # bokeh.io.show(p)

    # x = cds_x.data["x"]
    y = cds.data["y"][1:] # first element is redundant. size should be 200
    z = cds.data["z"][1:] # first element is redundant. size should be 200

    # the cds_x array is not the same size as the y and z arrays, because x is a step function
    # Interpolate x values from cds_x onto the time grid t, which is the same for y and z
    t_x = cds_x.data["t"]
    x_vals = cds_x.data["x"]

    # Create interpolation function
    x_interp_func = interp1d(t_x, x_vals, bounds_error=False, fill_value="extrapolate")

    # Interpolated x values on the same grid as y and z
    x_on_uniform_t = x_interp_func(t)

    # Create list of tuples (each row = [x, y, z])
    combined = list(zip(x_on_uniform_t, y, z))

    # Save to file as text
    with open(output_file, "w") as f:
        np.savetxt(f, combined, delimiter="\t", comments='')
        
def c1_ffl_and_or(output_file):
    # Parameters
    gamma = 1
    n_xy, n_yz, n_xz = 4, 4, 4
    t_stepdown = 0.5
    x_0 = 1.0
    duration = 20
    n = 1000
    t = np.linspace(0, duration, n)

    # Arguments for x_pulse: (t_0, t_f, tau, x_0, duty_cycle)
    x_args = (0, t_stepdown, t_stepdown, x_0, 1)
    gamma, beta, kappa = 1, 1, 1

    # Run biocircuits FFL plot for AND
    p_and, cds_and, _ = biocircuits.apps.plot_ffl(
        beta,
        gamma,
        kappa,
        n_xy,
        n_xz,
        n_yz,
        ffl="c1",
        logic="and",
        t=t,
        t_step_down=t_stepdown,
        normalized=False,
    )

    # Run biocircuits FFL plot for OR
    p_or, cds_or, _ = biocircuits.apps.plot_ffl(
        beta,
        gamma,
        kappa,
        n_xy,
        n_xz,
        n_yz,
        ffl="c1",
        logic="or",
        t=t,
        t_step_down=t_stepdown,
        normalized=False,
    )

    # Compute concentrations
    x_vals = x_pulse(t, *x_args)
    y_and_vals = cds_and.data["y"][1:]
    y_or_vals = cds_or.data["y"][1:]
    z_and_vals = cds_and.data["z"][1:]
    z_or_vals = cds_or.data["z"][1:]

    # Merge as sum of AND + OR (matches Protein.calcProdRate)
    y_vals = y_and_vals + y_or_vals
    z_vals = z_and_vals + z_or_vals

    # Save to file for use as expected data
    xyz_concentrations = np.stack([x_vals, y_vals, z_vals], axis=1)
    np.savetxt(output_file, xyz_concentrations, comments='')


# Run the script
if __name__ == '__main__':
    # c1_ffl_and(output_file="c1_ffl_and_short_results.txt") # Short pulse
    # c1_ffl_and(output_file="c1_ffl_and_long_results.txt", t_stepdown=15.0, tau=20, x_0=1.0) # Long pulse
    # c1_ffl_or(output_file="c1_ffl_or_results.txt")
    c1_ffl_and_or(output_file="c1_ffl_and_or_results.txt")