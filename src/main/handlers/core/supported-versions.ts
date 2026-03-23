import { encryptedPayloadSchema } from './../../schemas/encryptedPayload.schema'
import { GetSupportedVersionsResponse, SupportedVersion } from '../../../shared/schemas/ipc'
import { API_ROUTES } from '../../apiRoutes'
import { secureStore } from '../../store/secureStore'
import { execute } from '../../utils/execute'
import { z } from 'zod'
import { decryptData } from '../../utils/api/crypt'

export const SupportedVersionSchema = z.object({
  id: z.number(),
  version: z.string(),
  codename: z.string(),
  isSupported: z.boolean()
})

export const SupportedVersionsResponseSchema = z.array(SupportedVersionSchema)

export async function getSupportedVersions(): Promise<GetSupportedVersionsResponse> {
  const url = `${import.meta.env.VITE_API_BASE_URL}${API_ROUTES.CORE.SUPPORTED_VERSIONS}`

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  try {
    const response = await execute(() => {
      const sessionId = secureStore.getSecure('sessionId')
      if (sessionId) {
        requestHeaders['X-session-id'] = sessionId
      }

      return fetch(url, {
        method: 'GET',
        headers: requestHeaders
      })
    })

    if (!response.ok) {
      return {
        success: false,
        message: `Failed to fetch supported versions from server. Please check your connection and try again.`
      }
    }

    let rawData = await response.json()

    const isEncrypted = encryptedPayloadSchema.safeParse(rawData)

    if (isEncrypted.success) {
      rawData = await decryptData(isEncrypted.data)
    }

    const versions = await SupportedVersionsResponseSchema.safeParseAsync(rawData)

    if (!versions.success) {
      console.error('Validation error:', versions.error)
      return {
        success: false,
        message: `Received invalid data format for supported versions from server.`
      }
    }

    return { success: true, data: versions.data as SupportedVersion[] }
  } catch (error) {
    console.error('Error fetching supported versions:', error)
    return {
      success: false,
      message: 'Network error occurred while fetching supported versions.'
    }
  }
}
