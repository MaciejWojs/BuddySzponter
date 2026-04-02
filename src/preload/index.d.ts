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
        getAppVersion: () => Promise<string>
        getVersionStatus: () => Promise<
          'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'UPDATE_REQUIRED' | 'UNKNOWN'
        >
        isUpdateRequired: () => Promise<boolean>
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
    }
  }
}
