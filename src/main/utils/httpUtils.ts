import { z } from 'zod'
import { decryptPayload, type EncryptedPayload } from '../decrypt-payload'

// Schema verifying if the API payload is an AES-GCM encrypted package
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
  // Safe parsing without throwing errors by TS
  const parsed = encryptedPayloadSchema.safeParse(data)

  if (parsed.success) {
    try {
      // Since Zod passed it, we are 100% sure the structure is EncryptedPayload
      return decryptPayload(parsed.data as EncryptedPayload)
    } catch (error) {
      console.error('[API DECRYPTION ERROR]', error)
      throw new Error('Failed to decrypt secure response')
    }
  }

  // If it's a regular object or schema validation error, just return the original data
  return data
}
