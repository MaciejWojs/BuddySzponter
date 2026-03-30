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
  UploadAvatarResponse,
  WsActionResponse,
  WsConnectResponse,
  WsServerEvents
} from '../shared/schemas/ipc'
import {
  CreateConnectionRequestSchema,
  JoinConnectionRequestSchema
} from '../shared/schemas/connection'

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
    // ACTIONS
    connect: (token: string): Promise<WsConnectResponse> =>
      ipcRenderer.invoke('ws:connect', { connectionToken: token }),

    disconnect: (): Promise<WsActionResponse> => ipcRenderer.invoke('ws:disconnect'),

    respondAccept: (data: WsServerEvents['ws:access-accepted']): Promise<WsActionResponse> =>
      ipcRenderer.invoke('ws:respond-accept', { accept: true, data }),

    respondReject: (data: WsServerEvents['ws:access-rejected']): Promise<WsActionResponse> =>
      ipcRenderer.invoke('ws:respond-reject', { accept: false, data }),

    requestAccess: (data: WsServerEvents['ws:request-access']): Promise<WsActionResponse> =>
      ipcRenderer.invoke('ws:request-access', data),

    hostAcknowledge: (data: WsServerEvents['ws:acknowledged']): Promise<WsActionResponse> =>
      ipcRenderer.invoke('ws:acknowledged', data),

    guestAcknowledge: (data: WsServerEvents['ws:acknowledged']): Promise<WsActionResponse> =>
      ipcRenderer.invoke('ws:acknowledge', data),

    webrtcOffer: (data: WsServerEvents['webrtc:offer']): Promise<WsActionResponse> =>
      ipcRenderer.invoke('ws:webrtc-offer', data),

    webrtcAnswer: (data: WsServerEvents['webrtc:answer']): Promise<WsActionResponse> =>
      ipcRenderer.invoke('ws:webrtc-answer', data),

    webrtcIceCandidate: (data: WsServerEvents['webrtc:ice-candidate']): Promise<WsActionResponse> =>
      ipcRenderer.invoke('ws:webrtc-ice-candidate', data),

    webrtcReady: (data: WsServerEvents['webrtc:ready']): Promise<WsActionResponse> =>
      ipcRenderer.invoke('ws:webrtc-ready', data),

    // LISTENERS
    onConnected: (callback: (data: WsServerEvents['ws:connected']) => void) => {
      ipcRenderer.on('ws:connected', (_, data) => callback(data))
    },

    onDisconnected: (callback: (data: WsServerEvents['ws:disconnected']) => void) => {
      ipcRenderer.on('ws:disconnected', (_, data) => callback(data))
    },

    onConnectError: (callback: (data: WsServerEvents['ws:connect_error']) => void) => {
      ipcRenderer.on('ws:connect_error', (_, data) => callback(data))
    },

    onMessage: (callback: (data: WsServerEvents['ws:message']) => void) => {
      ipcRenderer.on('ws:message', (_, data) => callback(data))
    },

    onRequestAccess: (callback: (data: WsServerEvents['ws:request-access']) => void) => {
      ipcRenderer.on('ws:request-access', (_, data) => callback(data))
    },

    onAccessAccepted: (callback: (data: WsServerEvents['ws:access-accepted']) => void) => {
      ipcRenderer.on('ws:access-accepted', (_, data) => callback(data))
    },

    onAccessRejected: (callback: (data: WsServerEvents['ws:access-rejected']) => void) => {
      ipcRenderer.on('ws:access-rejected', (_, data) => callback(data))
    },

    onServerError: (callback: (data: WsServerEvents['ws:server-error']) => void) => {
      ipcRenderer.on('ws:server-error', (_, data) => callback(data))
    },

    onAcknowledged: (callback: (data: WsServerEvents['ws:acknowledged']) => void) => {
      ipcRenderer.on('ws:acknowledged', (_, data) => callback(data))
    },

    onWebRTCOffer: (callback: (data: WsServerEvents['webrtc:offer']) => void) => {
      ipcRenderer.on('webrtc:offer', (_, data) => callback(data))
    },
    onWebRTCAnswer: (callback: (data: WsServerEvents['webrtc:answer']) => void) => {
      ipcRenderer.on('webrtc:answer', (_, data) => callback(data))
    },
    onWebRTCIceCandidate: (callback: (data: WsServerEvents['webrtc:ice-candidate']) => void) => {
      ipcRenderer.on('webrtc:ice-candidate', (_, data) => callback(data))
    },
    onWebRTCReady: (callback: (data: WsServerEvents['webrtc:ready']) => void) => {
      ipcRenderer.on('webrtc:ready', (_, data) => callback(data))
    },

    removeAllListeners: () => {
      const channels: (keyof WsServerEvents)[] = [
        'ws:connected',
        'ws:disconnected',
        'ws:connect_error',
        'ws:message',
        'ws:request-access',
        'ws:access-accepted',
        'ws:access-rejected',
        'ws:server-error',
        'ws:acknowledged',
        'webrtc:offer',
        'webrtc:answer',
        'webrtc:ice-candidate',
        'webrtc:ready'
      ]
      channels.forEach((ch) => ipcRenderer.removeAllListeners(ch))
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
