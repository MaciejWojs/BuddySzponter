import { contextBridge, ipcRenderer, sharedTexture } from 'electron'
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
  WsCategory,
  WsConnectResponse
} from '../shared/schemas/ipc'
import {
  CreateConnectionRequestSchema,
  JoinConnectionRequestSchema
} from '../shared/schemas/connection'
import { ScreenCapture } from '@maciejwojs/screen-capture'
import {
  WsConnectionDisconnected,
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

interface SharedHandleInfo {
  handle: unknown
  width: number
  height: number
  bufferType?: number
  chunkSize?: number | bigint
  pixelFormat?: number
  modifier?: unknown
  stride?: number
  offset?: number
  planeSize?: unknown
}

// Opisujemy dostępne metody w klasie addona
interface ScreenCaptureInstance {
  start(): void
  stop(): void
  getSharedHandle(): SharedHandleInfo | null
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

    connection: (callbacks: {
      onConnected: (d: { socketId: string }) => void
      onDisconnected: (d: WsConnectionDisconnected) => void
      onConnectError: (d: { message: string }) => void
    }) => {
      ipcRenderer.on('ws:connection', (_, { type, data }) => {
        if (type === 'connected') callbacks.onConnected(data)
        if (type === 'disconnected') callbacks.onDisconnected(data)
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

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)

    const handleBuffer = Buffer.allocUnsafe(8)
    let capturer: ScreenCaptureInstance | null = null

    contextBridge.exposeInMainWorld('capture', {
      start: () => {
        if (!capturer) capturer = new ScreenCapture()
        capturer!.start()
      },
      stop: () => {
        if (capturer) capturer.stop()
      },
      getFrame: () => {
        if (!capturer) return null

        const info = capturer.getSharedHandle()
        if (!info || !info.handle) return null

        const chunkSize =
          typeof info.chunkSize === 'bigint' ? Number(info.chunkSize) : info.chunkSize
        console.log('Buffer Type:', info.bufferType, 'Chunk Size:', chunkSize)

        if (process.platform === 'linux') {
          console.log('Shared handle info:', info)
          if (info.bufferType !== 2 && info.bufferType !== 3) {
            console.warn('Unsupported buffer type:', info.bufferType)
            return null
          }

          if (typeof info.stride !== 'number' || typeof info.offset !== 'number') return null

          const fd = Number(info.handle as bigint)
          const spaFormat = typeof info.pixelFormat === 'number' ? info.pixelFormat : 0
          const pixelFormat =
            spaFormat === 10 || spaFormat === 7
              ? 'rgba'
              : spaFormat === 11 || spaFormat === 8
                ? 'bgra'
                : 'bgra'
          const modifierHex =
            typeof info.modifier === 'bigint' ? `0x${info.modifier.toString(16)}` : '0x0'
          const planeSize =
            typeof info.planeSize === 'bigint' ? Number(info.planeSize) : info.stride * info.height

          const imported = sharedTexture.subtle.importSharedTexture({
            pixelFormat,
            codedSize: { width: info.width, height: info.height },
            handle: {
              nativePixmap: {
                planes: [
                  {
                    fd,
                    stride: info.stride,
                    offset: info.offset,
                    size: planeSize
                  }
                ],
                modifier: modifierHex,
                supportsZeroCopyWebGpuImport: false
              }
            }
          })

          const frame = imported.getVideoFrame()
          return { frame, release: () => imported.release() }
        }

        handleBuffer.writeBigUInt64LE(info.handle as bigint, 0)

        const imported = sharedTexture.subtle.importSharedTexture({
          pixelFormat: 'bgra',
          codedSize: { width: info.width, height: info.height },
          handle: { ntHandle: handleBuffer }
        })

        const frame = imported.getVideoFrame()
        return { frame, release: () => imported.release() }
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
}
