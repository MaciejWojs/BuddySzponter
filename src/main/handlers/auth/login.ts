// src/main/handlers/auth/login.ts
import { ipcMain } from 'electron'
import { apiFetch } from '../../apiClient'
import { handleApiCall } from '../../utils/apiHelper'
import { API_ROUTES } from '../../apiRoutes'

export function registerLoginHandler(): void {
  ipcMain.handle('auth:login', async (_, credentials) => {
    // Zwykły, czytelny fetch. Zwróć uwagę na `body: JSON.stringify(...)`
    const requestPromise = apiFetch(API_ROUTES.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify(credentials)
    })

    // apiHelper zajmie się złapaniem błędów i ewentualnym odszyfrowaniem błędu 4xx/5xx
    const result = await handleApiCall(requestPromise)

    return result
  })
}
