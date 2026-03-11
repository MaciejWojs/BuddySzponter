import { contextBridge, ipcRenderer } from 'electron'
import type { EncryptedPayload } from '../main/decrypt-payload'

// Nasze API do Hono
const api = {
  auth: {
    register: (data: Record<string, unknown>) => ipcRenderer.invoke('auth:register', data),
    login: (credentials: Record<string, unknown>) => ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getMe: () => ipcRenderer.invoke('auth:me')
  }
}

// Twoje Krypto
const apiUtils = {
  decryptPayload: (p: EncryptedPayload) => ipcRenderer.invoke('decrypt-payload', p)
}

if (process.contextIsolated) {
  try {
    // USUNĘLIŚMY electron-toolkit! Wystawiamy tylko nasze 100% bezpieczne obiekty.
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
