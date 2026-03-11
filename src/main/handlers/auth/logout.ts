// src/main/handlers/auth/logout.ts
import { ipcMain } from 'electron'
import { authManager } from '../../authManager'

export function registerLogoutHandler(): void {
  ipcMain.handle('auth:logout', async () => {
    try {
      // Jeśli backend ma endpoint do wylogowania, odkomentuj to:
      // await apiFetch(API_ROUTES.AUTH.LOGOUT, { method: 'POST' })
    } catch (error) {
      console.error('[AUTH] Błąd podczas wylogowywania na backendzie:', error)
      // Nawet jeśli backend rzuci błędem, chcemy wylogować użytkownika lokalnie
    } finally {
      // Czyścimy tokeny niezależnie od wyniku zapytania
      authManager.clearTokens()
    }

    return { success: true }
  })
}
