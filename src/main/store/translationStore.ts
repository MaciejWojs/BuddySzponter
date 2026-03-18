import Store from 'electron-store'
import { Translation } from '../schemas/langSchemas'

export const translationStore = new Store<Record<string, Translation>>({
  name: 'translations-cache'
})
