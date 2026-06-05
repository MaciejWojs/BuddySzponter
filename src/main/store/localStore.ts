import Store from 'electron-store'
import { AppLanguage, Translation } from '../../shared/schemas/langSchemas'
import { UserResponseSchema } from '../../shared/schemas/user'
import type {
  AppThemeMode,
  CaptureBackendMode,
  VideoQualityPreset
} from '../../shared/schemas/appPreferences'

type StoreModule = { default: typeof Store }

const StoreClass = (
  typeof Store === 'function' ? Store : (Store as unknown as StoreModule).default
) as typeof Store

interface LocalStoreSchema {
  language: AppLanguage
  availableLanguages: AppLanguage[]
  hardwareId: string | null
  videoQualityPreset: VideoQualityPreset
  closeToTray: boolean
  theme: AppThemeMode
  captureBackend: CaptureBackendMode
}

export const localStore = new StoreClass<LocalStoreSchema>({
  name: 'app-settings',
  defaults: {
    language: 'en',
    availableLanguages: [],
    hardwareId: null,
    videoQualityPreset: 'high',
    closeToTray: true,
    theme: 'dark',
    captureBackend: 'auto'
  }
})

export const authStore = new StoreClass<{
  accessToken: string | null
  user: UserResponseSchema | null
}>({
  name: 'auth',
  defaults: {
    accessToken: null,
    user: null
  }
})

export const translationStore = new StoreClass<Record<string, Translation>>({
  name: 'translations-cache'
})

export function clearLocalStore(): void {
  localStore.clear()
  authStore.clear()
  translationStore.clear()
}
