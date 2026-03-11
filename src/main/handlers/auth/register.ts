import { ipcMain } from 'electron'
import { apiClient } from '../../apiClient'
import { API_ROUTES } from '../../apiRoutes'
import { handleApiCall } from '../../utils/apiHelper'

export function registerRegisterHandler(): void {
  ipcMain.handle('auth:register', (_, payload) => {
    return handleApiCall(apiClient.post(API_ROUTES.AUTH.REGISTER, payload))
  })
}
