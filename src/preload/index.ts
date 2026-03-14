import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { EncryptedPayload } from '../main/decrypt-payload'
import { ipcRenderer } from 'electron/renderer'

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
const apiUtils = {
  decryptPayload: (p: EncryptedPayload) => {
    return ipcRenderer.invoke('decrypt-payload', p)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    // Expose only explicit, safe APIs to renderer.
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('apiUtils', apiUtils)
  } catch (error) {
    console.error(error)
  }
} else {
  // Fallback for non-isolated context mode (dev/legacy).
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.apiUtils = apiUtils
}
