import Store from 'electron-store'
import { Translation } from '../../shared/schemas/langSchemas'

type StoreModule = { default: typeof Store }

const StoreClass = (
  typeof Store === 'function' ? Store : (Store as unknown as StoreModule).default
) as typeof Store

export const translationStore = new StoreClass<Record<string, Translation>>({
  name: 'translations-cache'
})
