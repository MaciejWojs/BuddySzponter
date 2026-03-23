import Store from 'electron-store'
import { AppLanguage, Translation } from '../../shared/schemas/langSchemas'

type StoreModule = { default: typeof Store }

const StoreClass = (
  typeof Store === 'function' ? Store : (Store as unknown as StoreModule).default
) as typeof Store

interface LocalStoreSchema {
  language: AppLanguage
  availableLanguages: AppLanguage[]
  hardwareId: string | null
}

export const localStore = new StoreClass<LocalStoreSchema>({
  name: 'app-settings',
  defaults: {
    language: 'en',
    availableLanguages: [],
    hardwareId: null
  }
})

export const authStore = new StoreClass<{ accessToken: string | null }>({
  name: 'auth',
  defaults: {
    accessToken: null
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
