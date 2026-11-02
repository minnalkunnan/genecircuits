def _u(x, K):
    scale = K if K and K > 0 else 1.0
    return x / scale


def rep_hill(x, n, K=1.0):
    u = _u(x, K)
    return 1.0 / (1.0 + u ** n)


def act_hill(x, n, K=1.0):
    return 1.0 - rep_hill(x, n, K)


def aa_and(x, y, nx, ny, Kx=1.0, Ky=1.0):
    ux, uy = _u(x, Kx), _u(y, Ky)
    return ux ** nx * uy ** ny / (1.0 + ux ** nx) / (1.0 + uy ** ny)


def aa_or(x, y, nx, ny, Kx=1.0, Ky=1.0):
    ux, uy = _u(x, Kx), _u(y, Ky)
    denom = (1.0 + ux ** nx) * (1.0 + uy ** ny)
    return (denom - 1.0) / denom


def aa_or_single(x, y, nx, ny, Kx=1.0, Ky=1.0):
    ux, uy = _u(x, Kx), _u(y, Ky)
    num = ux ** nx + uy ** ny
    return num / (1.0 + num)


def rr_and(x, y, nx, ny, Kx=1.0, Ky=1.0):
    ux, uy = _u(x, Kx), _u(y, Ky)
    return 1.0 / (1.0 + ux ** nx) / (1.0 + uy ** ny)


def rr_and_single(x, y, nx, ny, Kx=1.0, Ky=1.0):
    ux, uy = _u(x, Kx), _u(y, Ky)
    return 1.0 / (1.0 + ux ** nx + uy ** ny)


def rr_or(x, y, nx, ny, Kx=1.0, Ky=1.0):
    ux, uy = _u(x, Kx), _u(y, Ky)
    return (1.0 + ux ** nx + uy ** ny) / (1.0 + ux ** nx) / (1.0 + uy ** ny)


def ar_and(x, y, nx, ny, Kx=1.0, Ky=1.0):
    ux, uy = _u(x, Kx), _u(y, Ky)
    return ux ** nx / (1.0 + ux ** nx) / (1.0 + uy ** ny)


def ar_or(x, y, nx, ny, Kx=1.0, Ky=1.0):
    ux, uy = _u(x, Kx), _u(y, Ky)
    return (1.0 + ux ** nx * (1.0 + uy ** ny)) / (1.0 + ux ** nx) / (1.0 + uy ** ny)


def ar_and_single(x, y, nx, ny, Kx=1.0, Ky=1.0):
    ux, uy = _u(x, Kx), _u(y, Ky)
    return ux ** nx / (1.0 + ux ** nx + uy ** ny)


def ar_or_single(x, y, nx, ny, Kx=1.0, Ky=1.0):
    ux, uy = _u(x, Kx), _u(y, Ky)
    return (1.0 + ux ** nx) / (1.0 + ux ** nx + uy ** ny)
