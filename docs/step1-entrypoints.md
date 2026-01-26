# Step 1 — Electron entrypoints inventory (authoritative)

## Main process entrypoint
- Source file: `src/index.ts`
- Config evidence:
  - `webpack.main.config.ts` → `entry: './src/index.ts'`

## Renderer entrypoint
- Source file: `src/renderer.ts`
- HTML shell: `src/index.html`
- Config evidence:
  - `forge.config.ts` → WebpackPlugin `renderer.entryPoints[0]`:
    - `html: './src/index.html'`
    - `js: './src/renderer.ts'`
    - `name: 'main_window'`

## Preload entrypoint
- Source file: `src/preload.ts`
- Config evidence:
  - `forge.config.ts` → WebpackPlugin `renderer.entryPoints[0].preload.js: './src/preload.ts'`

## IPC surface (to be verified in Step 1.1)
Pending: extract actual IPC channel names from `src/index.ts` and `src/preload.ts` using a targeted search that excludes `.webpack/` and `node_modules/`.

## IPC surface (validated from source)

### Channels
- `run-simulation`
  - main: `ipcMain.handle('run-simulation', …)` in `src/index.ts`
  - preload: `ipcRenderer.invoke('run-simulation', …)` exposed as `window.electron.runSimulation` in `src/preload.ts`
- `get-backend-status`
  - main: `ipcMain.handle('get-backend-status', …)` in `src/index.ts`
  - preload: `ipcRenderer.invoke('get-backend-status')` exposed as `window.electron.getBackendStatus` in `src/preload.ts`
- `backend-ready`
  - main: `webContents.send('backend-ready', true|false)` in `src/index.ts`
  - preload: `ipcRenderer.on('backend-ready', …)` exposed as `window.electron.onBackendReady` in `src/preload.ts`
