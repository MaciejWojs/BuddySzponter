import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { RegisterInput, LoginInput } from '../main/schemas/authSchemas'
import { AppLanguage, Translation } from '../shared/schemas/langSchemas'
import {
  CreateConnectionResponse,
  GetAvailableLanguagesResponse,
  GetCurrentUserResponse,
  GetLocaleResponse,
  GetSupportedVersionsResponse,
  JoinConnectionResponse,
  UploadAvatarResponse
} from '../shared/schemas/ipc'
import {
  CreateConnectionRequestSchema,
  JoinConnectionRequestSchema
} from '../shared/schemas/connection'
import {
  WsConnectionAccepted,
  WsConnectionError,
  WsConnectionRejected,
  WsRequestAccess
} from '../shared/schemas/ws'

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
    setLanguage: (lang: AppLanguage): Promise<boolean> =>
      ipcRenderer.invoke('settings:setLanguage', lang),
    getTranslation: (): Promise<Translation> => ipcRenderer.invoke('settings:getTranslation'),
    getHardwareId: (): Promise<string> => ipcRenderer.invoke('settings:getHardwareId')
  },
  core: {
    getLocale: (lang: AppLanguage): Promise<GetLocaleResponse> =>
      ipcRenderer.invoke('core:getLocale', lang),
    getAvailableLanguages: (): Promise<GetAvailableLanguagesResponse> =>
      ipcRenderer.invoke('core:getAvailableLanguages'),
    getSupportedVersions: (): Promise<GetSupportedVersionsResponse> =>
      ipcRenderer.invoke('core:getSupportedVersions'),
    getAppVersion: (): Promise<string> => ipcRenderer.invoke('core:getAppVersion')
  },
  users: {
    uploadAvatar: (userId: string | null): Promise<UploadAvatarResponse> =>
      ipcRenderer.invoke('user:uploadAvatar', userId),

    uploadAvatarByBuffer: (
      userId: string | null,
      buffer: ArrayBuffer,
      fileName: string,
      mimeType: string
    ): Promise<UploadAvatarResponse> =>
      ipcRenderer.invoke('user:uploadAvatarByBuffer', userId, buffer, fileName, mimeType),

    getCurrentUser: (): Promise<GetCurrentUserResponse> => ipcRenderer.invoke('user:getCurrentUser')
  },
  connection: {
    create: (data: CreateConnectionRequestSchema): Promise<CreateConnectionResponse> =>
      ipcRenderer.invoke('connection:create', data),

    join: (data: JoinConnectionRequestSchema): Promise<JoinConnectionResponse> =>
      ipcRenderer.invoke('connection:join', data)
  },
  ws: {
    // ==========================================
    // 1. Akcje (Wysyłanie: Renderer -> Main)
    // ==========================================
    connect: (connectionToken: string) => ipcRenderer.invoke('ws:connect', { connectionToken }),

    disconnect: () => ipcRenderer.invoke('ws:disconnect'),

    // Ujednolicamy parametry zgodnie z tym, co przesyła Twój komponent Vue
    respondAccept: (data: WsConnectionAccepted) =>
      ipcRenderer.invoke('ws:respond-accept', { accept: true, data }),

    respondReject: (data: WsConnectionRejected) =>
      ipcRenderer.invoke('ws:respond-reject', { accept: false, data }),

    requestAccess: (data: WsRequestAccess) => ipcRenderer.invoke('ws:request-access', data),

    // ==========================================
    // 2. Listenery Systemowe (Socket.io)
    // ==========================================
    onConnected: (callback: (data: { socketId: string }) => void) => {
      ipcRenderer.on('ws:connected', (_event, data) => callback(data as { socketId: string }))
    },

    onDisconnected: (callback: (data: { reason: string }) => void) => {
      ipcRenderer.on('ws:disconnected', (_event, data) => callback(data as { reason: string }))
    },

    onConnectError: (callback: (data: { message: string }) => void) => {
      ipcRenderer.on('ws:connect_error', (_event, data) => callback(data as { message: string }))
    },

    onMessage: (callback: (data: unknown) => void) => {
      ipcRenderer.on('ws:message', (_event, data) => callback(data))
    },

    // ==========================================
    // 3. Listenery Biznesowe (Logika aplikacji)
    // ==========================================

    onRequestAccess: (callback: (data: WsRequestAccess) => void) => {
      ipcRenderer.on('ws:request-access', (_event, data) => callback(data as WsRequestAccess))
    },

    onAccessAccepted: (callback: (data: WsConnectionAccepted) => void) => {
      ipcRenderer.on('ws:access-accepted', (_event, data) => callback(data as WsConnectionAccepted))
    },

    onAccessRejected: (callback: (data: WsConnectionRejected) => void) => {
      ipcRenderer.on('ws:access-rejected', (_event, data) => callback(data as WsConnectionRejected))
    },

    onServerError: (callback: (data: WsConnectionError) => void) => {
      ipcRenderer.on('ws:server-error', (_event, data) => callback(data as WsConnectionError))
    },

    // ==========================================
    // 4. Czyszczenie (Krytyczne dla wydajności)
    // ==========================================
    removeAllListeners: () => {
      const channels = [
        'ws:connected',
        'ws:disconnected',
        'ws:connect_error',
        'ws:message',
        'ws:request-access',
        'ws:access-accepted',
        'ws:access-rejected',
        'ws:server-error'
      ]
      channels.forEach((channel) => ipcRenderer.removeAllListeners(channel))
    }
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
