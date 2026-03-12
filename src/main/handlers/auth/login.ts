import { ipcMain } from 'electron'
import { ApiClient } from '../../apiClient'
import { API_ROUTES } from '../../apiRoutes'
import { ApiHelper } from '../../utils/apiHelper'
import { loginInputSchema, loginResponseSchema } from '../../schemas/authSchemas'

export function registerLoginHandler(): void {
  ipcMain.handle('auth:login', async (_, rawData) => {
    // 1. Input validation (Fail-Fast)
    const parsedInput = loginInputSchema.safeParse(rawData)
    if (!parsedInput.success) {
      return { success: false, status: 400, error: parsedInput.error.issues }
    }

    // 2. Call the "Magic Helper"
    return ApiHelper.handleApiCall(
      ApiClient.getInstance().fetch('POST', API_ROUTES.AUTH.LOGIN, parsedInput.data),
      {
        responseSchema: loginResponseSchema,
        decrypt: true,
        saveTokens: true
      }
    )
  })
}
