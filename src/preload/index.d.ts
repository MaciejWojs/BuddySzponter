import type { LoginInput, RegisterInput } from '../main/schemas/authSchemas'
import { ElectronAPI } from '@electron-toolkit/preload'
import { AppLanguage, Translation } from '../shared/schemas/langSchemas'
import {
  WsActionResponse,
  WsConnectResponse,
  WsConnectionListeners,
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
import { UserInputSchema } from '@shared/schemas/user'

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
        login: (credentials: UserInputSchema) => Promise<IpcResponse<{ accessTokenSaved: boolean }>>
        logout: () => Promise<IpcResponse>
        getMe: () => Promise<GetCurrentUserResponse>
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
        getVersionStatus: () => Promise<
          'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'UPDATE_REQUIRED' | 'UNKNOWN'
        >
        isUpdateRequired: () => Promise<boolean>
      }
      users: {
        uploadAvatar: (userId: string | null) => Promise<UploadAvatarResponse>
        uploadAvatarByBuffer: (
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
      app: {
        quitApp: () => Promise<void>
        showApp: () => Promise<void>
        hideToTray: () => Promise<void>
        setHostTrayMode: (active: boolean) => Promise<void>
      }
      input: {
        moveAbsolute: (x: number, y: number) => Promise<void>
      }
      events: {
        onToggleMic: (callback: () => void) => void
        onStopSession: (callback: () => void) => void
        removeAllListeners: () => void
      }
    }
    capture: {
      start: () => Promise<void>
      stop: () => Promise<void>
      subscribeStream: (onFrame: (frame: VideoFrame) => void) => () => void
    }
    screenCapture: {
      requestStream: () => void
      stopStream: () => void
      registerReceiver: () => void
      onFrameReceived: (callback: (frameData: VideoFrame) => void) => () => void
    }
    recorder: {
      saveFile: (buffer: ArrayBuffer) => Promise<void>
    }
  }
}
