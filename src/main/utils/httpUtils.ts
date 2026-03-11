import { z } from 'zod'
import { decryptPayload, type EncryptedPayload } from '../decrypt-payload'

// Schemat weryfikujący, czy payload z API jest zaszyfrowaną paczką AES-GCM
const encryptedPayloadSchema = z.object({
  payload: z.object({
    iv: z.string(),
    tag: z.string(),
    data: z.string()
  })
})

export function buildConfig(
  options: RequestInit,
  controller: AbortController,
  token?: string | null
): RequestInit {
  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return { ...options, headers, signal: controller.signal }
}

export async function parseResponseData(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    return response.json().catch(() => null)
  }
  return null
}

export function tryDecryptData(data: unknown): unknown {
  // Bezpieczne parsowanie bez rzucania błędami przez TS
  const parsed = encryptedPayloadSchema.safeParse(data)

  if (parsed.success) {
    try {
      // Skoro Zod to przepuścił, jesteśmy pewni w 100%, że struktura to EncryptedPayload
      return decryptPayload(parsed.data as EncryptedPayload)
    } catch (error) {
      console.error('[API DECRYPTION ERROR]', error)
      throw new Error('Failed to decrypt secure response')
    }
  }

  // Jeśli to zwykły obiekt lub błąd walidacji schematu, po prostu zwracamy oryginalne dane
  return data
}
