// src/main/handlers/auth/logout.ts
import { ipcMain } from 'electron'
import { authManager } from '../../authManager'

export function registerLogoutHandler(): void {
  ipcMain.handle('auth:logout', async () => {
    try {
      // If the backend has a logout endpoint, uncomment this:
      // await apiFetch(API_ROUTES.AUTH.LOGOUT, { method: 'POST' })
    } catch (error) {
      console.error('[AUTH] Error during backend logout:', error)
      // Even if the backend throws an error, we want to log out the user locally
    } finally {
      // Clear tokens regardless of the request result
      authManager.clearTokens()
    }

    return { success: true }
  })
}
