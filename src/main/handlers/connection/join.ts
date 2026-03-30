import { APP_ERRORS } from '../../../shared/constants/errors'
import { JoinConnectionRequestSchema } from '../../../shared/schemas/connection'
import { JoinConnectionResponse } from '../../../shared/schemas/ipc'
import { API_ROUTES } from '../../apiRoutes'
import { joinConnectionSchemaRequest } from '../../schemas/connectionRequestSchema'
import { appSettings } from '../../services/SettingsService'
import { buildRoute } from '../../utils/api/path'
import { execute } from '../../utils/execute'
import { decryptData, encryptData } from '../../utils/api/crypt'
import { secureStore } from '../../store/secureStore'

export async function joinConnection(
  data: JoinConnectionRequestSchema
): Promise<JoinConnectionResponse> {
  try {
    const url = buildRoute(API_ROUTES.CONNECTION.JOIN)
    const isEncryptionEnabled = import.meta.env.VITE_ENCRYPT_DATA === 'true'
    const fingerprint = appSettings.getHardwareId()
    const deviceName = appSettings.getDeviceName()
    const osName = appSettings.getOsName()

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    const parsedBody = joinConnectionSchemaRequest.safeParse({
      ...data,
      fingerprint,
      os: osName,
      name: deviceName
    })

    if (!parsedBody.success) {
      return {
        success: APP_ERRORS.CONNECTION.INVALID_RESPONSE.success,
        message: APP_ERRORS.CONNECTION.INVALID_RESPONSE.message
      }
    }

    const response = await execute(async () => {
      let finalBody: unknown = parsedBody.data

      if (isEncryptionEnabled) {
        requestHeaders['X-session-id'] = secureStore.getSecure('sessionId') || ''
        finalBody = await encryptData(parsedBody.data)
      }

      return fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(finalBody)
      })
    })

    const responseJson = await response.json()
    const decryptedResponse = isEncryptionEnabled ? await decryptData(responseJson) : responseJson

    return {
      success: true,
      data: decryptedResponse
    }
  } catch (error) {
    console.error('Error joining connection:', error)
    return {
      success: false,
      message: 'An error occurred while trying to join the connection. Please try again.'
    }
  }
}
