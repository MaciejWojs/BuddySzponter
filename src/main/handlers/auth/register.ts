import { ipcMain } from 'electron'
import { API_ROUTES } from '../../apiRoutes'
import {
  registerInputSchema,
  registerResponseSchema,
  apiErrorSchema,
  RegisterResponse,
  ApiErrorResponse
} from '../../schemas/authSchemas'
import { isPayLoadEncrypted } from '../../utils/isPayLoadEncrypted'
import { EncryptedPayload } from '../../schemas/encryptedPayloadSchema'
import { decryptPayload } from '../../decrypt-payload'

interface HandlerResult<T> {
  success: boolean
  status: number
  data?: T
  error?: ApiErrorResponse | object[]
}

export function registerRegisterHandler(): void {
  ipcMain.handle(
    'auth:register',
    async (_event, rawData: unknown): Promise<HandlerResult<RegisterResponse>> => {
      console.log('Received registration data:', rawData)
      const input = registerInputSchema.safeParse(rawData)
      if (!input.success) {
        return { success: false, status: 400, error: input.error.issues }
      }

      try {
        const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost/api/v1'
        const url = `${baseURL}${API_ROUTES.AUTH.REGISTER}`

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input.data)
        })

        const body = response.status !== 204 ? await response.json().catch(() => null) : null

        if (!response.ok) {
          const res = apiErrorSchema.safeParse(body)
          if (res.success) {
            return {
              success: false,
              status: response.status,
              error: res.data
            }
          }
        }

        if (isPayLoadEncrypted(body)) {
          const result = decryptPayload(body as EncryptedPayload)
          return {
            success: true,
            status: response.status,
            data: result as RegisterResponse
          }
        }

        const result = registerResponseSchema.safeParse(body)
        if (!result.success) {
          return { success: false, status: 422, error: result.error.issues }
        }

        return {
          success: true,
          status: response.status,
          data: result.data
        }
      } catch (err) {
        console.error('Network error:', err)

        return {
          success: false,
          status: 500,
          error: { message: 'Błąd połączenia z serwerem' }
        }
      }
    }
  )
}
