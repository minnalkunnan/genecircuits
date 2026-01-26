import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use IPC
contextBridge.exposeInMainWorld('electron', {
  runSimulation: (circuitData: any) => ipcRenderer.invoke('run-simulation', circuitData),

  // NEW: Listen for backend-ready signal from main process
  onBackendReady: (callback: (ready: boolean) => void) => {
    ipcRenderer.on('backend-ready', (_, ready: boolean) => callback(ready));
  },

  getBackendStatus: (): Promise<boolean> => ipcRenderer.invoke('get-backend-status'),
});