import { contextBridge, ipcRenderer, sharedTexture } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
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
  WsCategory,
  WsConnectResponse
} from '../shared/schemas/ipc'
import type { WsConnectionListeners } from '../shared/schemas/ipc'
import {
  CreateConnectionRequestSchema,
  JoinConnectionRequestSchema
} from '../shared/schemas/connection'
import {
  WsRequestAccess,
  WsConnectionAccepted,
  WsConnectionRejected,
  WsConnectionError,
  WsAcknowledged,
  WsWebRTCOffer,
  WsWebRTCAnswer,
  WsWebRTCIceCandidate,
  WsWebRTCReady
} from '../shared/schemas/ws'
import { LoginInput, RegisterInput } from '../shared/schemas/user'

const recorder = {
  saveFile: (buffer: ArrayBuffer) => ipcRenderer.invoke('save-file', buffer)
}

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
    getAppVersion: (): Promise<string> => ipcRenderer.invoke('core:getAppVersion'),
    getVersionStatus: (): Promise<
      'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'UPDATE_REQUIRED' | 'UNKNOWN'
    > => ipcRenderer.invoke('core:getVersionStatus'),
    isUpdateRequired: (): Promise<boolean> => ipcRenderer.invoke('core:isUpdateRequired')
  },
  users: {
    uploadAvatar: (userId: string | null): Promise<UploadAvatarResponse> =>
      ipcRenderer.invoke('user:uploadAvatar', userId),

    uploadAvatarByBuffer: (
      buffer: ArrayBuffer,
      fileName: string,
      mimeType: string
    ): Promise<UploadAvatarResponse> =>
      ipcRenderer.invoke('user:uploadAvatarByBuffer', buffer, fileName, mimeType),

    getCurrentUser: (): Promise<GetCurrentUserResponse> => ipcRenderer.invoke('user:getCurrentUser')
  },
  connection: {
    create: (data: CreateConnectionRequestSchema): Promise<CreateConnectionResponse> =>
      ipcRenderer.invoke('connection:create', data),

    join: (data: JoinConnectionRequestSchema): Promise<JoinConnectionResponse> =>
      ipcRenderer.invoke('connection:join', data)
  },
  ws: {
    // 1. AKCJE (Wysyłanie z Vue do Main)
    connect: (token: string): Promise<WsConnectResponse> =>
      ipcRenderer.invoke('ws:connect', { connectionToken: token }),

    disconnect: (): Promise<WsActionResponse> => ipcRenderer.invoke('ws:disconnect'),

    respondAccept: (): Promise<WsActionResponse> => ipcRenderer.invoke('ws:respond-accept'),
    respondReject: (): Promise<WsActionResponse> => ipcRenderer.invoke('ws:respond-reject'),

    requestAccess: (sessionId: string): Promise<WsActionResponse> =>
      ipcRenderer.invoke('ws:request-access', { sessionId }),

    hostAcknowledge: (): Promise<WsActionResponse> => ipcRenderer.invoke('ws:acknowledged'),
    guestAcknowledge: (): Promise<WsActionResponse> => ipcRenderer.invoke('ws:acknowledge'),

    webrtcOffer: (data: WsWebRTCOffer): Promise<WsActionResponse> =>
      ipcRenderer.invoke('ws:webrtc-offer', data),
    webrtcAnswer: (data: WsWebRTCAnswer): Promise<WsActionResponse> =>
      ipcRenderer.invoke('ws:webrtc-answer', data),
    webrtcIceCandidate: (data: WsWebRTCIceCandidate): Promise<WsActionResponse> =>
      ipcRenderer.invoke('ws:webrtc-ice-candidate', data),
    webrtcReady: (data: WsWebRTCReady): Promise<WsActionResponse> =>
      ipcRenderer.invoke('ws:webrtc-ready', data),

    // 2. LISTENERY (Odbieranie przez 4 magistrale)

    connection: (callbacks: WsConnectionListeners) => {
      ipcRenderer.on('ws:connection', (_, { type, data }) => {
        if (type === 'connected') callbacks.onConnected(data)
        if (type === 'disconnected') callbacks.onDisconnected(data)
        if (type === 'manual-disconnected') callbacks.onManualDisconnected(data)
        if (type === 'connect_error') callbacks.onConnectError(data)
      })
    },

    // 2. Kategoria: Dostęp
    access: (callbacks: {
      onRequest: (d: WsRequestAccess) => void
      onAccepted: (d: WsConnectionAccepted) => void
      onRejected: (d: WsConnectionRejected) => void
      onError: (d: WsConnectionError) => void
    }) => {
      ipcRenderer.on('ws:access', (_, { type, data }) => {
        if (type === 'request-access') callbacks.onRequest(data)
        if (type === 'accepted') callbacks.onAccepted(data)
        if (type === 'rejected') callbacks.onRejected(data)
        if (type === 'server-error') callbacks.onError(data)
      })
    },

    // 3. Kategoria: Handshake
    handshake: (callbacks: { onAcknowledged: (d: WsAcknowledged) => void }) => {
      ipcRenderer.on('ws:handshake', (_, { type, data }) => {
        if (type === 'acknowledged') callbacks.onAcknowledged(data)
      })
    },

    // 4. Kategoria: WebRTC
    webrtc: (callbacks: {
      onOffer: (d: WsWebRTCOffer) => void
      onAnswer: (d: WsWebRTCAnswer) => void
      onIceCandidate: (d: WsWebRTCIceCandidate) => void
      onReady: (d: WsWebRTCReady) => void
    }) => {
      ipcRenderer.on('ws:webrtc', (_, { type, data }) => {
        if (type === 'offer') callbacks.onOffer(data)
        if (type === 'answer') callbacks.onAnswer(data)
        if (type === 'ice-candidate') callbacks.onIceCandidate(data)
        if (type === 'ready') callbacks.onReady(data)
      })
    },

    removeAllListeners: () => {
      const categories: WsCategory[] = ['ws:connection', 'ws:access', 'ws:handshake', 'ws:webrtc']
      categories.forEach((ch) => ipcRenderer.removeAllListeners(ch))
    }
  }
}

let currentOnFrame: ((frame: VideoFrame) => void) | null = null

const registerSharedTextureReceiver = (): void => {
  const receiverApi = sharedTexture as unknown as {
    registerReceiver?: () => void
  }

  if (receiverApi && typeof receiverApi.registerReceiver === 'function') {
    receiverApi.registerReceiver()
  }
}

try {
  sharedTexture.setSharedTextureReceiver(async (data) => {
    try {
      if (currentOnFrame) {
        const frame = data.importedSharedTexture.getVideoFrame()
        if (frame) {
          currentOnFrame(frame)
        }
      }
    } catch (e) {
      console.error('[Preload] Odbiór klatki sharedTexture:', e)
    } finally {
      // Must release the shared texture regardless
      data.importedSharedTexture.release()
    }
  })
} catch (e) {
  console.error('[Preload] Failed to set shared texture receiver:', e)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    
    contextBridge.exposeInMainWorld('recorder', recorder)

    contextBridge.exposeInMainWorld('capture', {
      start: () => ipcRenderer.invoke('capture:start'),
      stop: () => ipcRenderer.invoke('capture:stop'),
      subscribeStream: (onFrame: (frame: VideoFrame) => void) => {
        currentOnFrame = onFrame

        const cleanup = (): void => {
          if (currentOnFrame) {
            currentOnFrame = null
            ipcRenderer.postMessage('capture:stop-stream', null)
          }
        }
        window.addEventListener('beforeunload', cleanup, { once: true })

        // Request main to start sending frames to this frame
        ipcRenderer.postMessage('capture:request-stream', null)

        return () => {
          window.removeEventListener('beforeunload', cleanup)
          cleanup()
        }
      }
    })

    contextBridge.exposeInMainWorld('screenCapture', {
      requestStream: () => {
        void ipcRenderer.invoke('capture:start')
        ipcRenderer.postMessage('capture:request-stream', null)
      },
      stopStream: () => {
        ipcRenderer.postMessage('capture:stop-stream', null)
        void ipcRenderer.invoke('capture:stop')
      },
      registerReceiver: () => {
        registerSharedTextureReceiver()
      },
      onFrameReceived: (callback: (frame: VideoFrame) => void) => {
        currentOnFrame = callback

        return () => {
          if (currentOnFrame === callback) {
            currentOnFrame = null
          }
        }
      }
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.recorder = recorder
}
