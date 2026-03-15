import { ipcMain } from 'electron'
import { handshake } from '../../utils/handshake'
import { encryptPayload } from '../../utils/encrypt-payload'
import { decryptPayload } from '../../utils/decrypt-payload'

export async function register(): Promise<void> {
  let r
  try {
    r = await handshake('http://localhost/api/v1/crypto/handshake')
    console.log('Handshake completed')
  } catch (error) {
    console.error('Handshake failed:', error)
    throw error
  }

  ipcMain.handle(
    'auth:register',
    async (_event, { email, password, passwordConfirm, nickname }) => {
      try {
        const baseURL = 'http://localhost/api/v1'
        const url = `${baseURL}/auth/register`

        const aesKey = Buffer.from(r.aesKey, 'base64')
        const bd = { email, password, passwordConfirm, nickname }
        const temp = await encryptPayload(bd, aesKey)
        const encryptedPayload = { payload: { ...temp } }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-session-id': r.sessionId
          },
          body: JSON.stringify(encryptedPayload)
        })

        if (!response.ok) {
          const errorData = await response.json()
          const decryptedresponse = decryptPayload(errorData, r.aesKey)
          console.log('Decrypted error response:', decryptedresponse)
          // throw new Error(decryptedresponse.mass || 'Registration failed')
        }
        const data = await response.json()
        return data
      } catch (error) {
        console.error('Error during registration:', error)
        throw new Error('Registration failed')
      }
    }
  )
}
