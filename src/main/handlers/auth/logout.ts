// src/main/handlers/auth/logout.ts
import { ipcMain } from 'electron'
import { ApiClient } from '../../apiClient'
import { API_ROUTES } from '../../apiRoutes'
import { ApiHelper } from '../../utils/apiHelper'
import { TokenManager } from '../../tokenManager'

export function registerLogoutHandler(): void {
  ipcMain.handle('auth:logout', async () => {
    const requestPromise = ApiClient.getInstance().fetch('POST', API_ROUTES.AUTH.LOGOUT)

    await ApiHelper.handleApiCall(requestPromise)
    TokenManager.getInstance().clearTokens()

    return { success: true, status: 200 }
  })
}
