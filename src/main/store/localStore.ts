import Store from 'electron-store'
import { AppLanguage } from '../../shared/schemas/langSchemas'

type StoreModule = { default: typeof Store }

const StoreClass = (
  typeof Store === 'function' ? Store : (Store as unknown as StoreModule).default
) as typeof Store

interface LocalStoreSchema {
  language: AppLanguage
  hardwareId: string | null
}

export const localStore = new StoreClass<LocalStoreSchema>({
  name: 'app-settings',
  defaults: {
    language: 'en',
    hardwareId: null
  }
})

export function clearLocalStore(): void {
  localStore.clear()
}
