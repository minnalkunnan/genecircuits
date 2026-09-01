def rep_hill(x, n):
    return 1.0 / (1.0 + x ** n)


def act_hill(x, n):
    return 1.0 - rep_hill(x, n)


def aa_and(x, y, nx, ny):
    return x ** nx * y ** ny / (1.0 + x ** nx) / (1.0 + y ** ny)


def aa_or(x, y, nx, ny):
    denom = (1.0 + x ** nx) * (1.0 + y ** ny)
    return (denom - 1.0) / denom


def aa_or_single(x, y, nx, ny):
    num = x ** nx + y ** ny
    return num / (1.0 + num)


def rr_and(x, y, nx, ny):
    return 1.0 / (1.0 + x ** nx) / (1.0 + y ** ny)


def rr_and_single(x, y, nx, ny):
    return 1.0 / (1.0 + x ** nx + y ** ny)


def rr_or(x, y, nx, ny):
    return (1.0 + x ** nx + y ** ny) / (1.0 + x ** nx) / (1.0 + y ** ny)


def ar_and(x, y, nx, ny):
    return x ** nx / (1.0 + x ** nx) / (1.0 + y ** ny)


def ar_or(x, y, nx, ny):
    return (1.0 + x ** nx * (1.0 + y ** ny)) / (1.0 + x ** nx) / (1.0 + y ** ny)


def ar_and_single(x, y, nx, ny):
    return x ** nx / (1.0 + x ** nx + y ** ny)


def ar_or_single(x, y, nx, ny):
    return (1.0 + x ** nx) / (1.0 + x ** nx + y ** ny)
