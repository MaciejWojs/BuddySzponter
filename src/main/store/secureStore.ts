import { safeStorage } from 'electron'
import Store from 'electron-store'

interface StoreSchema {
  sessionId: string
  aesKey: string
  refreshToken?: string
}

class SecureStore {
  private store: Store<StoreSchema>

  constructor() {
    type StoreImport = typeof Store & { default?: typeof Store }

    const StoreClass = (Store as StoreImport).default || Store

    this.store = new StoreClass({ name: 'buddy-secure-storage' })
  }

  setSecure(key: keyof StoreSchema, value: string): void {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(value).toString('base64')
      this.store.set(key, encrypted)
    } else {
      this.store.set(key, value) // Fallback
    }
  }

  getSecure(key: keyof StoreSchema): string | undefined {
    const data = this.store.get(key)
    if (!data) return undefined

    if (safeStorage.isEncryptionAvailable()) {
      try {
        const buffer = Buffer.from(data, 'base64')
        return safeStorage.decryptString(buffer)
      } catch (e) {
        console.error(`Błąd deszyfrowania klucza ${key}:`, e)
        return undefined
      }
    }
    return data
  }

  clearSession(): void {
    this.store.delete('sessionId')
    this.store.delete('aesKey')
    this.store.delete('refreshToken')
  }

  clearRefreshToken(): void {
    this.store.delete('refreshToken')
  }
}

export const secureStore = new SecureStore()
