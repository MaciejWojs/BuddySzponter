import { createECDH, createHash } from 'crypto'
import { handshakeResponseSchema } from '../schemas/handshakeResponseSchema'

/**
 * Performs a cryptographic handshake with the server to establish a shared AES encryption key.
 *
 * @example
 * ```typescript
 * const { sessionId, aesKey } = await handshake('http://localhost:3000/api/v1/crypto/handshake')
 * // Save sessionId and aesKey (e.g., in a secure store or memory) for future encrypted requests
 * console.log('Session ID:', sessionId)
 * console.log('AES Key (base64):', aesKey)
 * ```
 *
 * @param url - The handshake endpoint URL.
 * @returns A promise that resolves to an object containing the `sessionId` and the base64 encoded `aesKey`.
 */
export async function handshake(url: string): Promise<{ sessionId: string; aesKey: string }> {
  const ecdh = createECDH('prime256v1')
  const clientPublicKey = ecdh.generateKeys('base64', 'uncompressed')

  const request = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ clientPublicKey })
  })

  if (!request.ok) {
    throw new Error(`Handshake failed with status: ${request.status}`)
  }

  const rawResponse: unknown = await request.json()
  const parsedResponse = handshakeResponseSchema.safeParse(rawResponse)

  if (!parsedResponse.success) {
    console.error('[Handshake] Invalid response structure:', parsedResponse.error.issues)
    throw new Error('Invalid handshake response from server: Missing or malformed data.')
  }

  const { serverPublicKey, sessionId } = parsedResponse.data

  const sharedSecret = ecdh.computeSecret(serverPublicKey, 'base64')

  const aesKey = createHash('sha256').update(sharedSecret).digest()

  return {
    sessionId,
    aesKey: aesKey.toString('base64')
  }
}
