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
        // --- AKCJE (Wysyłanie) ---
        connect: (token: string) => Promise<{ success: boolean; message?: string }>
        disconnect: () => Promise<{ success: boolean }>
        respondAccept: (data: WsConnectionAccepted) => Promise<{ success: boolean }>
        respondReject: (data: WsConnectionRejected) => Promise<{ success: boolean }>
        requestAccess: (data: WsRequestAccess) => Promise<{ success: boolean }>

        // --- LISTENERY SYSTEMOWE (Surowe dane z Socket.io) ---
        onConnected: (callback: (data: { socketId: string }) => void) => void
        onDisconnected: (callback: (data: { reason: string }) => void) => void
        onConnectError: (callback: (data: { message: string }) => void) => void
        onMessage: (callback: (data: unknown) => void) => void

        // --- LISTENERY BIZNESOWE (Typowane przez Zod) ---
        onRequestAccess: (callback: (data: WsRequestAccess) => void) => void
        onAccessAccepted: (callback: (data: WsConnectionAccepted) => void) => void
        onAccessRejected: (callback: (data: WsConnectionRejected) => void) => void
        onServerError: (callback: (data: WsConnectionError) => void) => void

        // --- INNE ---
        removeAllListeners: () => void
      }
    }
  }
}
