import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom API exposed to the renderer process.
const api = {
  window: {
    // Forward window control requests from renderer to the main process.
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close: (): void => ipcRenderer.send('window:close'),
    setAlwaysOnTop: (flag: boolean): void => ipcRenderer.send('window:set-always-on-top', flag)
  }
}

// Expose Electron APIs safely through contextBridge when context isolation
// is enabled. If isolation is disabled, attach them directly to window.
if (process.contextIsolated) {
  try {
    // Expose only explicit, safe APIs to renderer.
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // Fallback for non-isolated context mode (dev/legacy).
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
