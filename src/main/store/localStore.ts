import Store from 'electron-store'
import { AppLanguage } from '../../shared/schemas/langSchemas'

// Definiujemy strukturę, jakiej spodziewamy się w przypadku importu ESM w CJS
type StoreModule = { default: typeof Store }

// Obejście problemu ESM/CJS bez użycia 'any'
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
    language: 'pl',
    hardwareId: null
  }
})
