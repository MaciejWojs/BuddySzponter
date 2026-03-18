import Store from 'electron-store'
import { AppLanguage } from '../schemas/langSchemas'

interface LocalStoreSchema {
  language: AppLanguage
  hardwareId: string | null
}

export const localStore = new Store<LocalStoreSchema>({
  name: 'app-settings',
  defaults: {
    language: 'pl',
    hardwareId: null
  }
})
