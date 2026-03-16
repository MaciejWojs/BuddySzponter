import { ipcMain } from 'electron'
import { encryptPayload } from '../../utils/encrypt-payload'
import { execute } from '../../utils/execute'
import { secureStore } from '../../utils/secureStore'
import { decryptPayload } from '../../utils/decrypt-payload'
import { API_ROUTES } from '../../apiRoutes'

/**
 * auth:register
 */
export async function register(): Promise<void> {
  ipcMain.handle(
    'auth:register',
    async (_event, { email, password, passwordConfirm, nickname }) => {
      try {
        const response = await execute(async () => {
          const key = secureStore.getSecure('aesKey')
          const id = secureStore.getSecure('sessionId')

          if (!key || !id) {
            throw new Error('No session found. Please complete the handshake first.')
          }

          const baseURL = import.meta.env.VITE_API_BASE_URL
          const url = `${baseURL}${API_ROUTES.AUTH.REGISTER}`
          const aesKeyBuffer = Buffer.from(key, 'base64')

          const payloadData = { email, password, passwordConfirm, nickname }
          const encrypted = await encryptPayload(payloadData, aesKeyBuffer)

          return await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-session-id': id
            },
            body: JSON.stringify({ payload: encrypted })
          })
        })

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}))
          return {
            success: false,
            error: errorBody.message || `Server returned error: ${response.status}`,
            status: response.status
          }
        }

        const encryptedJson = await response.json()

        const currentKey = secureStore.getSecure('aesKey')
        const decryptedData = await decryptPayload(encryptedJson, currentKey!)

        return {
          success: true,
          data: decryptedData
        }
      } catch (error: unknown) {
        console.error('Error in register IPC:', error)
        return {
          success: false,
          error: (error as Error).message || 'Unknown error occurred'
        }
      }
    }
  )
}
