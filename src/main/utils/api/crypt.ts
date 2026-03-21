import { EncryptedPayload, encryptedPayloadSchema } from '../../schemas/encryptedPayload.schema'
import { decryptPayload } from '../decrypt-payload'
import { encryptPayload } from '../encrypt-payload'
import { secureStore } from '../../store/secureStore'
import { handshake } from '../handshake'
import { API_ROUTES } from '../../apiRoutes'

async function getCryptoSession(): Promise<string> {
  let key = secureStore.getSecure('aesKey')
  const id = secureStore.getSecure('sessionId')

  if (!key || !id) {
    const newSession = await handshake(
      `${import.meta.env.VITE_API_BASE_URL}${API_ROUTES.CRYPTO.HANDSHAKE}`
    )
    secureStore.setSecure('sessionId', newSession.sessionId)
    secureStore.setSecure('aesKey', newSession.aesKey)
    key = newSession.aesKey
  }

  return key!
}

export async function encryptData(data: object): Promise<EncryptedPayload> {
  const key = await getCryptoSession()

  const encryptedResult = encryptPayload(data, Buffer.from(key, 'base64'))

  return {
    payload: encryptedResult
  }
}

export async function decryptData(data: EncryptedPayload | object): Promise<object> {
  const validation = encryptedPayloadSchema.safeParse(data)

  if (!validation.success) {
    return data as object
  }

  const key = await getCryptoSession()
  return decryptPayload(validation.data, key)
}
