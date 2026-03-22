import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { RegisterInput, LoginInput } from '../main/schemas/authSchemas'
import { AppLanguage } from '../shared/schemas/langSchemas'

// Custom APIs for renderer
const api = {
  auth: {
    register: (data: RegisterInput) => ipcRenderer.invoke('auth:register', data),
    login: (credentials: LoginInput) => ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getMe: () => ipcRenderer.invoke('auth:me'),
    refresh: () => ipcRenderer.invoke('auth:refresh')
  },
  settings: {
    getLanguage: (): Promise<AppLanguage> => ipcRenderer.invoke('settings:getLanguage'),
    setLanguage: (
      lang: AppLanguage
    ): Promise<{ success: boolean; data?: unknown; error?: string }> =>
      ipcRenderer.invoke('i18n:loadTranslations', lang),
    getHardwareId: (): Promise<string> => ipcRenderer.invoke('settings:getHardwareId')
  },
  core: {
    getLocale: (params: { lang: string; version: string }) =>
      ipcRenderer.invoke('core:getLocale', params),
    getAvailableLanguages: () => ipcRenderer.invoke('core:getAvailableLanguages'),
    getSupportedVersions: () => ipcRenderer.invoke('core:getSupportedVersions')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
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
