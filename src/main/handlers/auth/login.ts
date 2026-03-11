import { ipcMain } from 'electron'
import { apiClient } from '../../apiClient'
import { API_ROUTES } from '../../apiRoutes'
import { handleApiCall } from '../../utils/apiHelper'

export function registerLoginHandler(): void {
  ipcMain.handle('auth:login', (_, credentials) =>
    handleApiCall(apiClient.post(API_ROUTES.AUTH.LOGIN, credentials))
  )
}
