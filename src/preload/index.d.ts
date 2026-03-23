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
        setLanguage: (
          lang: AppLanguage
        ) => Promise<{ success: boolean; data?: unknown; error?: string }>
      }
      core: {
        getLocale: (params: {
          lang: string
          version: string
        }) => Promise<GetAvailableLanguagesResponse>
        getAvailableLanguages: () => Promise<GetAvailableLanguagesResponse>
        getSupportedVersions: () => Promise<GetSupportedVersionsResponse>
      }
    }
  }
}
