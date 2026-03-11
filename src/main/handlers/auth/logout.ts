import { ipcMain } from 'electron'
import { authManager } from '../../authManager'

export function registerLogoutHandler(): void {
  ipcMain.handle('auth:logout', () => {
    authManager.clearTokens()
    return { success: true }
  })
}
