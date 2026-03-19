/**
 * auth:register
 */
import { RegisterApiResult } from './../../schemas/apiResultSchema'
import { RegisterInput } from '../../schemas/authSchemas'
import { securePost } from '../../utils/apiClient'
import { API_ROUTES } from '../../apiRoutes'

export async function register(data: RegisterInput): Promise<RegisterApiResult> {
  try {
    const result = await securePost(API_ROUTES.AUTH.REGISTER, data)
    return result as RegisterApiResult
  } catch (error) {
    console.error('Registration failed:', error)
    return {
      success: false,
      error: { message: 'An unexpected error occurred during registration.' }
    }
  }
}
