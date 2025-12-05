# From this example: http://be150.caltech.edu/2020/content/lessons/08_repressilator.html#:~:text=def%20repressilator_rhs(x%2C%20t%2C%20beta%2C%20n)%3A 
# Which appears to use three rep hill functions

import numpy as np
import scipy.integrate
import bokeh.plotting
import bokeh.palettes
import biocircuits
from scipy.interpolate import interp1d

# Canonical repressilator
def repressilator_rhs(x, t, beta, n):
    """
    Returns 3-array of (dx_1/dt, dx_2/dt, dx_3/dt)
    """
    x1, x2, x3 = x

    # x_1, x_2, x_3 = x
    # return np.array(
    #     [
    #         beta / (1 + x_3 ** n) - x_1,
    #         beta / (1 + x_1 ** n) - x_2,
    #         beta / (1 + x_2 ** n) - x_3,
    #     ]
    # )

    prod1 = beta * biocircuits.rep_hill(x3, n)  # repressed by protein 3
    prod2 = beta * biocircuits.rep_hill(x1, n)  # repressed by protein 1
    prod3 = beta * biocircuits.rep_hill(x2, n)  # repressed by protein 2

    dx1 = prod1 - x1
    dx2 = prod2 - x2
    dx3 = prod3 - x3

    return np.array([dx1, dx2, dx3])

# Self-repressing repressilator
def repressilator_rhs_self(x, t, beta, n, self_coeff=2):
    x1, x2, x3 = x
    prod1 = beta * biocircuits.rep_hill(x3, n)                # repressed by protein 3
    prod2 = beta * biocircuits.rep_hill(x1, n) * biocircuits.rep_hill(x2, self_coeff)  # repressed by protein 0 and itself
    prod3 = beta * biocircuits.rep_hill(x2, n)                # repressed by protein 1

    dx1 = prod1 - x1
    dx2 = prod2 - x2
    dx3 = prod3 - x3

    return np.array([dx1, dx2, dx3])

# Initial condiations
x0 = np.array([1, 1, 1.2])

# Number of points to use in plots
n_points = 1000

def run_and_plot(rhs_func, x0, beta, n, t_max, output_txt, output_html, self_coeff=None):
    t = np.linspace(0, t_max, n_points)
    if self_coeff is not None:
        x = scipy.integrate.odeint(rhs_func, x0, t, args=(beta, n, self_coeff))
    else:
        x = scipy.integrate.odeint(rhs_func, x0, t, args=(beta, n))

    # Save results
    with open(output_txt, "w") as f:
        np.savetxt(f, x, comments="")

    # Plot
    colors = bokeh.palettes.d3["Category10"][3]
    p = bokeh.plotting.figure(
        frame_width=550, frame_height=200, x_axis_label="t", x_range=[0, t_max]
    )
    for i, x_vals in enumerate(x.transpose()):
        p.line(t, x_vals, line_width=2, color=colors[i], legend_label=f"Protein {i+1}")
    p.legend.location = "top_left"

    bokeh.plotting.output_file(output_html)
    bokeh.plotting.show(p)


# Set up parameters
beta = 5
n = 3
t_max = 10

run_and_plot(
    repressilator_rhs,
    x0,
    beta,
    n,
    t_max,
    output_txt="repressilator_results.txt",
    output_html="repressilator_plot.html"
)

run_and_plot(
    repressilator_rhs_self,
    x0,
    beta,
    n,
    t_max,
    output_txt="repressilator_self_repress_results.txt",
    output_html="repressilator_self_repress_plot.html",
    self_coeff=2
)
