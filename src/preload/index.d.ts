// src/preload/index.d.ts (lub inny plik .d.ts w Twoim projekcie)

import { ElectronAPI } from '@electron-toolkit/preload'
import { AppLanguage, Translation } from '../shared/schemas/langSchemas'
import {
  WsActionResponse,
  WsConnectResponse,
  WsConnectionEvent,
  WsAccessEvent,
  WsHandshakeEvent,
  WsWebRtcEvent,
  IpcResponse,
  GetLocaleResponse,
  GetAvailableLanguagesResponse,
  GetSupportedVersionsResponse,
  GetCurrentUserResponse,
  UploadAvatarResponse,
  CreateConnectionResponse,
  JoinConnectionResponse,
  DesktopSource
} from '../shared/schemas/ipc'
import {
  WsRequestAccess,
  WsConnectionAccepted,
  WsConnectionRejected,
  WsConnectionError,
  WsAcknowledged,
  WsWebRTCOffer,
  WsWebRTCAnswer,
  WsWebRTCIceCandidate,
  WsWebRTCReady,
  WsConnectionDisconnected
} from '../shared/schemas/ws'
import {
  CreateConnectionRequestSchema,
  JoinConnectionRequestSchema
} from '../shared/schemas/connection'

// --- DEFINICJE CALLBACKÓW DLA MAGISTRAL ---

interface WsConnectionListeners {
  onConnected: (data: { socketId: string }) => void
  onDisconnected: (data: WsConnectionDisconnected) => void
  onConnectError: (data: { message: string }) => void
}

interface WsAccessListeners {
  onRequest: (data: WsRequestAccess) => void
  onAccepted: (data: WsConnectionAccepted) => void
  onRejected: (data: WsConnectionRejected) => void
  onError: (data: WsConnectionError) => void
}

interface WsHandshakeListeners {
  onAcknowledged: (data: WsAcknowledged) => void
}

interface WsWebRtcListeners {
  onOffer: (data: WsWebRTCOffer) => void
  onAnswer: (data: WsWebRTCAnswer) => void
  onIceCandidate: (data: WsWebRTCIceCandidate) => void
  onReady: (data: WsWebRTCReady) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      auth: {
        register: (data: RegisterInput) => Promise<IpcResponse>
        login: (credentials: LoginInput) => Promise<IpcResponse<{ accessTokenSaved: boolean }>>
        logout: () => Promise<IpcResponse>
        getMe: () => Promise<IpcResponse<unknown>>
        refresh: () => Promise<void>
      }
      settings: {
        getLanguage: () => Promise<AppLanguage>
        setLanguage: (lang: AppLanguage) => Promise<boolean>
        getTranslation: () => Promise<Translation>
        getHardwareId: () => Promise<string>
      }
      core: {
        getLocale: (lang: AppLanguage) => Promise<GetLocaleResponse>
        getAvailableLanguages: () => Promise<GetAvailableLanguagesResponse>
        getSupportedVersions: () => Promise<GetSupportedVersionsResponse>
        getAppVersion: () => Promise<string>
      }
      users: {
        uploadAvatar: (userId: string | null) => Promise<UploadAvatarResponse>
        uploadAvatarByBuffer: (
          userId: string | null,
          buffer: ArrayBuffer,
          fileName: string,
          mimeType: string
        ) => Promise<UploadAvatarResponse>
        getCurrentUser: () => Promise<GetCurrentUserResponse>
      }
      connection: {
        create: (data: CreateConnectionRequestSchema) => Promise<CreateConnectionResponse>
        join: (data: JoinConnectionRequestSchema) => Promise<JoinConnectionResponse>
      }
      ws: {
        connect: (token: string) => Promise<WsConnectResponse>
        disconnect: () => Promise<WsActionResponse>

        respondAccept: () => Promise<WsActionResponse>
        respondReject: () => Promise<WsActionResponse>
        requestAccess: (sessionId: string) => Promise<WsActionResponse>

        hostAcknowledge: () => Promise<WsActionResponse>
        guestAcknowledge: () => Promise<WsActionResponse>

        webrtcOffer: (data: WsWebRTCOffer) => Promise<WsActionResponse>
        webrtcAnswer: (data: WsWebRTCAnswer) => Promise<WsActionResponse>
        webrtcIceCandidate: (data: WsWebRTCIceCandidate) => Promise<WsActionResponse>
        webrtcReady: (data: WsWebRTCReady) => Promise<WsActionResponse>

        // --- LISTENERY (Magistrale) ---
        connection: (callbacks: WsConnectionListeners) => void
        access: (callbacks: WsAccessListeners) => void
        handshake: (callbacks: WsHandshakeListeners) => void
        webrtc: (callbacks: WsWebRtcListeners) => void

        // --- CLEANUP ---
        removeAllListeners: () => void
      }
      desktop: {
        getSources: () => Promise<DesktopSource[]>
      }
    }
    capture: {
      start: () => Promise<void>
      stop: () => Promise<void>
      subscribeStream: (onFrame: (frame: VideoFrame) => void) => () => void
    }
  }
}
