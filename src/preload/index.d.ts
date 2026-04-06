import type { LoginInput, RegisterInput } from '../main/schemas/authSchemas'
import { ElectronAPI } from '@electron-toolkit/preload'
import type { AppLanguage, Translation } from '../shared/schemas/langSchemas'
import type {
  GetAvailableLanguagesResponse,
  GetCurrentUserResponse,
  GetLocaleResponse,
  GetSupportedVersionsResponse,
  IpcResponse,
  UploadAvatarResponse
} from '../shared/schemas/ipc'

type LoginCredentials = Pick<LoginInput, 'email' | 'password'>

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      auth: {
        register: (data: RegisterInput) => Promise<IpcResponse>
        login: (
          credentials: LoginCredentials
        ) => Promise<IpcResponse<{ accessTokenSaved: boolean }>>
        logout: () => Promise<IpcResponse>
        getMe: () => Promise<GetCurrentUserResponse>
        refresh: () => Promise<IpcResponse<{ accessTokenSaved: boolean }>>
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
          buffer: ArrayBuffer,
          fileName: string,
          mimeType: string,
          userId: string | null
        ) => Promise<UploadAvatarResponse>
        getCurrentUser: () => Promise<GetCurrentUserResponse>
      }
    }
  }
}
