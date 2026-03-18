import Store from 'electron-store'
import { Translation } from '../../shared/schemas/langSchemas'

// Definiujemy pomocniczy typ dla struktury "wrapper"
type StoreModule = { default: typeof Store }

// Używamy unknown zamiast any - to uciszy linter i jest bezpieczniejsze
const StoreClass = (
  typeof Store === 'function' ? Store : (Store as unknown as StoreModule).default
) as typeof Store

export const translationStore = new StoreClass<Record<string, Translation>>({
  name: 'translations-cache'
})
