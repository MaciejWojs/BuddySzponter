import { ipcMain } from 'electron'

import { encryptPayload } from '../../utils/encrypt-payload'
import { execute } from '../../utils/execute'
import { secureStore } from '../../utils/secureStore'
import { decryptPayload } from '../../utils/decrypt-payload'

export async function register(): Promise<void> {
  ipcMain.handle(
    'auth:register',
    async (_event, { email, password, passwordConfirm, nickname }) =>
      await execute(async () => {
        const key = secureStore.getSecure('aesKey')
        const id = secureStore.getSecure('sessionId')

        if (!key || !id) {
          throw new Error('No session found. Please complete the handshake first.')
        }

        const baseURL = 'http://localhost/api/v1'
        const url = `${baseURL}/auth/register`

        const aesKeyBuffer = Buffer.from(key, 'base64')
        const payloadData = { email, password, passwordConfirm, nickname }
        const encrypted = await encryptPayload(payloadData, aesKeyBuffer)

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-session-id': id
          },
          body: JSON.stringify({ payload: encrypted })
        })
        const decrypted = await decryptPayload(await response.json(), key)
        console.log('Decrypted response from register:', decrypted)

        return response
      })
  )
}
