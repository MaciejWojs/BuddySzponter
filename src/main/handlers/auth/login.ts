/**
 * auth:login
 */

import { API_ROUTES } from '../../apiRoutes'
import { LoginApiResult, LoginApiResultSchema } from '../../schemas/apiResultSchema'
import { LoginInput, loginInputSchema } from '../../schemas/authSchemas'
import { appSettings } from '../../services/AppSettingsService'
import { securePost } from '../../utils/apiClient'

export async function login(data: LoginInput): Promise<LoginApiResult> {
  try {
    const fingerprint = appSettings.getHardwareId()
    const payload = { ...data, fingerprint }

    const validation = loginInputSchema.parse(payload)
    if (!validation) {
      throw new Error('Invalid login input')
    }

    const result = await securePost(API_ROUTES.AUTH.LOGIN, payload)
    // Walidacja przez LoginApiResultSchema
    return LoginApiResultSchema.parse(result)
  } catch (error) {
    console.error('Login failed:', error)
    return {
      success: false,
      error: { message: 'An unexpected error occurred during login.' }
    }
  }
}
