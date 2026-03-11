import { decryptPayload, type EncryptedPayload } from '../decrypt-payload'

export function buildConfig(
  options: RequestInit,
  controller: AbortController,
  token?: string | null // <-- DODANO
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
  if (
    typeof data === 'object' &&
    data !== null &&
    'payload' in data &&
    typeof (data as Record<string, unknown>).payload === 'object'
  ) {
    const payloadObj = (data as { payload: Record<string, unknown> }).payload
    if (
      payloadObj !== null &&
      typeof payloadObj.iv === 'string' &&
      typeof payloadObj.tag === 'string' &&
      typeof payloadObj.data === 'string'
    ) {
      try {
        return decryptPayload(data as EncryptedPayload)
      } catch (error) {
        console.error('[API DECRYPTION ERROR]', error)
        throw new Error('Failed to decrypt secure response')
      }
    }
  }
  return data
}
