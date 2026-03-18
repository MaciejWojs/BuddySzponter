import { AppLanguageSchema } from './../main/schemas/langSchemas'
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
      i18n: {
        load: (lang: AppLanguage) => Promise<ApiResponse<Translation>>
      }
      settings: {
        getLanguage: () => Promise<AppLanguage>
      }
    }
  }
}
