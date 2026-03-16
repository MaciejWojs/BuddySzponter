import { API_ROUTES } from '../apiRoutes'
import { encryptPayloadSchema } from '../schemas/encryptedPayload.schema'
import { handshake } from './handshake'
import { secureStore } from './secureStore'

export async function execute(callback: () => Promise<Response>): Promise<Response> {
  const result = await callback()

  if (result.status === 401) {
    const body = await result.json()
    const validation = encryptPayloadSchema.safeParse(body)

    if (!validation.success) {
      secureStore.clearSession()

      try {
        const newSession = await handshake(
          `${import.meta.env.VITE_API_BASE_URL}${API_ROUTES.CRYPTO.HANDSHAKE}`
        )
        secureStore.setSecure('sessionId', newSession.sessionId)
        secureStore.setSecure('aesKey', newSession.aesKey)

        const retryResult = await callback()
        if (!retryResult.ok) {
          throw new Error('Request failed after re-authentication')
        }

        return retryResult
      } catch {
        //errors
      }
    }
  }
  return result
}
