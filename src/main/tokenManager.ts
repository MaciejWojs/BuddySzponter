import { safeStorage } from 'electron'
import Store from 'electron-store'
import { HttpError } from './utils/httpErrors'
import { API_ROUTES } from './apiRoutes'

export class TokenManager {
  private static instance: TokenManager
  private store: Store
  private currentAccessToken: string | null = null

  // Lock for token refresh
  private refreshPromise: Promise<void> | null = null

  private constructor() {
    this.store = new Store({ name: 'buddy-secure-storage' })
  }

  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager()
    }
    return TokenManager.instance
  }

  // ==========================================
  // 1. MEMORY MANAGEMENT (RAM / Disk)
  // ==========================================

  public setAccessToken(token: string): void {
    this.currentAccessToken = token
  }

  public getAccessToken(): string | null {
    return this.currentAccessToken
  }

  public setRefreshToken(token: string): void {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(token)
      this.store.set('rt', encrypted.toString('base64'))
    } else {
      this.store.set('rt', token)
    }
  }

  public getRefreshToken(): string | null {
    const storedValue = this.store.get('rt') as string
    if (!storedValue) return null

    if (safeStorage.isEncryptionAvailable()) {
      try {
        const buffer = Buffer.from(storedValue, 'base64')
        return safeStorage.decryptString(buffer)
      } catch (e) {
        console.error('error during token decryption:', e)
        this.clearTokens()
        return null
      }
    }
    return storedValue
  }

  public clearTokens(): void {
    this.currentAccessToken = null
    this.store.delete('rt')
  }

  // ==========================================
  // 2. REFRESH LOGIC FROM BACKEND (Hono)
  // ==========================================

  public async refresh(baseURL: string): Promise<void> {
    // Prevent loop of sending 5 requests at once
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = this.performRefresh(baseURL).finally(() => {
      this.refreshPromise = null
    })

    return this.refreshPromise
  }

  private async performRefresh(baseURL: string): Promise<void> {
    const refreshToken = this.getRefreshToken()

    if (!refreshToken) {
      throw new HttpError(401, { message: 'No refresh token available' })
    }

    try {
      const refreshRes = await fetch(`${baseURL}${API_ROUTES.AUTH.REFRESH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      })

      if (!refreshRes.ok) {
        throw new Error('Token refresh failed')
      }

      const refreshData = (await refreshRes.json()) as {
        accessToken?: string
        refreshToken?: string
      }

      // Update tokens using own methods
      if (refreshData.accessToken) this.setAccessToken(refreshData.accessToken)
      if (refreshData.refreshToken) this.setRefreshToken(refreshData.refreshToken)
    } catch (refreshError) {
      console.error('Error during token refresh:', refreshError)
      this.clearTokens()
      throw new HttpError(401, { message: 'Session expired. Please log in again.' })
    }
  }
}
