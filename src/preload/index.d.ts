import { path } from 'node:path'
import { AppLanguageSchema } from '../shared/schemas/langSchemas'
import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      auth: {
        register: (data: RegisterInput) => Promise<ApiResponse<RegisterResponse>>
        login: (credentials: LoginInput) => Promise<ApiResponse<LoginResponse>>
        logout: () => Promise<ApiResponse<void>>
        getMe: () => Promise<ApiResponse<unknown>>
      }
      settings: {
        getLanguage: () => Promise<AppLanguage>
        setLanguage: (lang: AppLanguage) => Promise<boolean>
        getTranslation: () => Promise<Translation>
        getHardwareId: () => Promise<string>
      }
      core: {
        getLocale: (lang: string) => Promise<GetLocaleResponse>
        getAvailableLanguages: () => Promise<GetAvailableLanguagesResponse>
        getSupportedVersions: () => Promise<GetSupportedVersionsResponse>
        getAppVersion: () => GetAppVersionResponse
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
        create: (data: CreateConnectionRequestSchema) => Promise<CreateConnectionResponseSchema>
        join: (data: JoinConnectionRequestSchema) => Promise<JoinConnectionResponseSchema>
      }
      ws: {
        // --- ACTIONS ---
        connect: (token: string) => Promise<WsConnectResponse>
        disconnect: () => Promise<WsActionResponse>
        respondAccept: (data: WsServerEvents['ws:access-accepted']) => Promise<WsActionResponse>
        respondReject: (data: WsServerEvents['ws:access-rejected']) => Promise<WsActionResponse>
        requestAccess: (data: WsServerEvents['ws:request-access']) => Promise<WsActionResponse>
        hostAcknowledge: (data: WsServerEvents['ws:acknowledged']) => Promise<WsActionResponse>
        guestAcknowledge: (data: WsServerEvents['ws:acknowledge']) => Promise<WsActionResponse>
        webrtcOffer: (data: WsServerEvents['webrtc:offer']) => Promise<WsActionResponse>
        webrtcAnswer: (data: WsServerEvents['webrtc:answer']) => Promise<WsActionResponse>
        webrtcIceCandidate: (
          data: WsServerEvents['webrtc:ice-candidate']
        ) => Promise<WsActionResponse>
        webrtcReady: (data: WsServerEvents['webrtc:ready']) => Promise<WsActionResponse>

        // --- LISTENERS ---
        onConnected: (callback: (data: WsServerEvents['ws:connected']) => void) => void
        onDisconnected: (callback: (data: WsServerEvents['ws:disconnected']) => void) => void
        onConnectError: (callback: (data: WsServerEvents['ws:connect_error']) => void) => void
        onMessage: (callback: (data: WsServerEvents['ws:message']) => void) => void

        onRequestAccess: (callback: (data: WsServerEvents['ws:request-access']) => void) => void
        onAccessAccepted: (callback: (data: WsServerEvents['ws:access-accepted']) => void) => void
        onAccessRejected: (callback: (data: WsServerEvents['ws:access-rejected']) => void) => void
        onServerError: (callback: (data: WsServerEvents['ws:server-error']) => void) => void
        onAcknowledged: (callback: (data: WsServerEvents['ws:acknowledged']) => void) => void

        onWebRTCOffer: (callback: (data: WsServerEvents['webrtc:offer']) => void) => void
        onWebRTCAnswer: (callback: (data: WsServerEvents['webrtc:answer']) => void) => void
        onWebRTCIceCandidate: (
          callback: (data: WsServerEvents['webrtc:ice-candidate']) => void
        ) => void
        onWebRTCReady: (callback: (data: WsServerEvents['webrtc:ready']) => void) => void

        // --- CLEANUP ---
        removeAllListeners: () => void
      }
    }
  }
}
