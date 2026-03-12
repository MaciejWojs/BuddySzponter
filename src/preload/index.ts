// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import type { LoginInput, RegisterInput } from '../main/schemas/authSchemas'

const api = {
  auth: {
    register: (data: RegisterInput) => ipcRenderer.invoke('auth:register', data),
    login: (credentials: LoginInput) => ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getMe: () => ipcRenderer.invoke('auth:me')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
