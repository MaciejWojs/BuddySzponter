/**
 * auth:login
 */

import { API_ROUTES } from '../../apiRoutes'
import { LoginApiResult, LoginApiResultSchema } from '../../schemas/apiResultSchema'
import { LoginInput, loginInputSchema } from '../../schemas/authSchemas'
import { appSettings } from '../../services/AppSettingsService'
import { authStore } from '../../store/localStore'
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
    const accessToken = result.data?.accessToken
    if (accessToken) {
      authStore.set('accessToken', accessToken)
    }

    try {
      return LoginApiResultSchema.parse(result)
    } catch (error) {
      console.error('Failed to parse login result:', error)
      throw new Error('An unexpected error occurred during login.')
    }
  } catch (error) {
    console.error('Login failed:', error)
    return {
      success: false,
      error: { message: 'An unexpected error occurred during login.' }
    }
  }
}
