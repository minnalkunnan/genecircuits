# -*- mode: python ; coding: utf-8 -*-
import sys

from PyInstaller.utils.hooks import collect_all

block_cipher = None

# Collect native deps + package data reliably (fixes "No module named numpy" in frozen app)
numpy_datas, numpy_binaries, numpy_hidden = collect_all("numpy")
scipy_datas, scipy_binaries, scipy_hidden = collect_all("scipy")
mpl_datas, mpl_binaries, mpl_hidden = collect_all("matplotlib")

a = Analysis(
    ['ipc_server.py'],
    pathex=[],
    binaries=[] + numpy_binaries + scipy_binaries + mpl_binaries,
    datas=[] + numpy_datas + scipy_datas + mpl_datas,
    hiddenimports=[
        # keep your explicit ones
        'IPython',
        'IPython.display',
        'unicodedata',
        'matplotlib',
        'matplotlib.backends.backend_agg',
        'numpy',
        'scipy',
        'scipy.integrate',
        # plus anything collect_all discovered
        *numpy_hidden,
        *scipy_hidden,
        *mpl_hidden,
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='app',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False if sys.platform == 'win32' else True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
