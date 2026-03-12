// src/main/authManager.ts
import { safeStorage } from 'electron'
import Store from 'electron-store'

// Database on disk (%APPDATA% on Windows)
const store = new Store({ name: 'buddy-secure-storage' })

// Variable in RAM (disappears after app shutdown)
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
        this.clearTokens() // Someone tampered with the file - remove
        console.warn(e)
        return null
      }
    }
    return storedValue
  },

  // --- LOGOUT ---
  clearTokens() {
    currentAccessToken = null
    store.delete('rt')
  }
}
