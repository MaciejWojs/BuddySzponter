import { contextBridge, ipcRenderer } from 'electron'
import type { EncryptedPayload } from '../main/schemas/encryptedPayloadSchema'

// Our API for Hono
const api = {
  auth: {
    register: (data: Record<string, unknown>) => ipcRenderer.invoke('auth:register', data),
    login: (credentials: Record<string, unknown>) => ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getMe: () => ipcRenderer.invoke('auth:me')
  }
}

// Your Crypto
const apiUtils = {
  decryptPayload: (p: EncryptedPayload) => ipcRenderer.invoke('decrypt-payload', p)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    // REMOVED electron-toolkit! We only expose our 100% safe objects.
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('apiUtils', apiUtils)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.apiUtils = apiUtils
}
