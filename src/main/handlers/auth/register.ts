// src/main/handlers/auth/register.ts
import { ipcMain } from 'electron'
import { apiFetch } from '../../apiClient' // Pobieramy naszą nową główną funkcję
import { API_ROUTES } from '../../apiRoutes'
import { handleApiCall } from '../../utils/apiHelper'

export function registerRegisterHandler(): void {
  ipcMain.handle('auth:register', async (_, payload) => {
    const requestPromise = apiFetch(API_ROUTES.AUTH.REGISTER, {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    return await handleApiCall(requestPromise)
  })
}
