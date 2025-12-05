
import numpy as np
import scipy.integrate
import bokeh.plotting
import bokeh.palettes
from scipy.interpolate import interp1d

def toggle_switch_rhs(x, t, beta, n):
    """
    Returns 2-array of (dx_1/dt, dx_2/dt)
    """
    x_1, x_2 = x

    return np.array([
        beta / (1 + x_2 ** n) - x_1,
        beta / (1 + x_1 ** n) - x_2,
    ])

# Initial condiations
x0 = np.array([1, 1.2])

# Number of points to use in plots
n_points = 1000

def toggle_switch_plot(beta, n, t_max):
    # Solve for species concentrations
    t = np.linspace(0, t_max, n_points)
    x = scipy.integrate.odeint(toggle_switch_rhs, x0, t, args=(beta, n))

    with open("toggle_switch_results.txt", "w") as f:
        np.savetxt(f, x, comments="")

    colors = bokeh.palettes.d3["Category10"][3]

    p = bokeh.plotting.figure(
        frame_width=550, frame_height=200, x_axis_label="t", x_range=[0, t_max]
    )

    for i, x_vals in enumerate(x.transpose()):
        p.line(
            t, x_vals, line_width=2, color=colors[i], legend_label=str(i + 1)
        )

    p.legend.location = "top_left"

    return p

# Set up parameters
beta = 1
n = 3
t_max = 10

# Call solver
p = toggle_switch_plot(beta, n, t_max)

# Show plot
bokeh.plotting.output_file("toggle_switch_plot.html")
bokeh.plotting.show(p)