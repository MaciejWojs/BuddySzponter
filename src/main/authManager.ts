// src/main/authManager.ts
import { safeStorage } from 'electron'
import Store from 'electron-store'

// Baza danych na dysku (%APPDATA% na Windows)
const store = new Store({ name: 'buddy-secure-storage' })

// Zmienna w RAM-ie (znika po wyłączeniu apki)
let currentAccessToken: string | null = null

export const authManager = {
  // --- ACCESS TOKEN ---
  setAccessToken(token: string) {
    currentAccessToken = token
  },

  getAccessToken(): string | null {
    return currentAccessToken
  },

  // --- REFRESH TOKEN ---
  setRefreshToken(token: string) {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(token)
      store.set('rt', encrypted.toString('base64'))
    } else {
      store.set('rt', token) // Fallback
    }
  },

  getRefreshToken(): string | null {
    const storedValue = store.get('rt') as string
    if (!storedValue) return null

    if (safeStorage.isEncryptionAvailable()) {
      try {
        const buffer = Buffer.from(storedValue, 'base64')
        return safeStorage.decryptString(buffer)
      } catch (e) {
        this.clearTokens() // Ktoś majstrował przy pliku - usuwamy
        console.warn(e)
        return null
      }
    }
    return storedValue
  },

  // --- WYLOGOWANIE ---
  clearTokens() {
    currentAccessToken = null
    store.delete('rt')
  }
}
