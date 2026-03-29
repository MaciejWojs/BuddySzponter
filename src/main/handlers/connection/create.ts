import { APP_ERRORS } from './../../../shared/constants/errors'
import { CreateConnectionRequestSchema } from './../../../shared/schemas/connection'
import { CreateConnectionResponse } from '../../../shared/schemas/ipc'
import { API_ROUTES } from '../../apiRoutes'
import { buildRoute } from '../../utils/api/path'
import { execute } from '../../utils/execute'
import { secureStore } from '../../store/secureStore'
import { decryptData, encryptData } from '../../utils/api/crypt'
import { appSettings } from '../../services/SettingsService'
import { createConnectionSchemaRequest } from '../../schemas/connectionRequestSchema'

export async function createConnection(
  data: CreateConnectionRequestSchema
): Promise<CreateConnectionResponse> {
  try {
    const url = buildRoute(API_ROUTES.CONNECTION.CREATE)
    const isEncryptionEnabled = import.meta.env.VITE_ENCRYPT_DATA === 'true'
    const fingerprint = appSettings.getHardwareId()
    const deviceName = appSettings.getDeviceName()
    const osName = appSettings.getOsName()

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    const parsedBody = createConnectionSchemaRequest.safeParse({
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

    const response = await execute(() => {
      let finalBody: unknown = parsedBody.data

      if (isEncryptionEnabled) {
        requestHeaders['X-session-id'] = secureStore.getSecure('sessionId') || ''
        finalBody = encryptData(parsedBody.data)
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
  } catch {
    return {
      success: APP_ERRORS.CONNECTION.FAILED.success,
      message: APP_ERRORS.CONNECTION.FAILED.message
    }
  }
}
