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
        uploadAvatar: (userId: string) => Promise<UploadAvatarResponse>
        uploadAvatarByBuffer: (
          userId: string,
          buffer: ArrayBuffer,
          fileName: string,
          mimeType: string
        ) => Promise<UploadAvatarResponse>
      }
    }
  }
}
