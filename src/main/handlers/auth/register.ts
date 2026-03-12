// src/main/handlers/auth/register.ts
import { ipcMain } from 'electron'
import { ApiClient } from '../../apiClient'
import { API_ROUTES } from '../../apiRoutes'
import { ApiHelper } from '../../utils/apiHelper'
import { registerInputSchema, registerResponseSchema } from '../../schemas/authSchemas'

export function registerRegisterHandler(): void {
  ipcMain.handle('auth:register', async (_, rawData) => {
    const parsedInput = registerInputSchema.safeParse(rawData)
    if (!parsedInput.success) {
      return { success: false, status: 400, error: parsedInput.error.issues }
    }

    return ApiHelper.handleApiCall(
      ApiClient.getInstance().fetch('POST', API_ROUTES.AUTH.REGISTER, parsedInput.data),
      {
        responseSchema: registerResponseSchema,
        decrypt: true
      }
    )
  })
}
