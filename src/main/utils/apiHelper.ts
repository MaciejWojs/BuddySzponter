// src/main/utils/apiHelper.ts
import { decryptPayload, type EncryptedPayload } from '../decrypt-payload'
import { HttpError, type FetchResponse } from '../apiClient'

type ApiResult<T = unknown> =
  | { success: true; status: number; data: T }
  | { success: false; status: number; data: unknown }

export async function handleApiCall<T = unknown>(
  apiPromise: Promise<FetchResponse<T>>
): Promise<ApiResult<T>> {
  try {
    const response = await apiPromise
    return { success: true, status: response.status, data: response.data }
  } catch (error: unknown) {
    // Catching errors thrown by apiClient (both from server and 408 timeouts)
    if (error instanceof HttpError) {
      let errorData = error.data ?? {
        message: error.message || 'Wystąpił nieznany błąd HTTP'
      }
      if (
        typeof errorData === 'object' &&
        errorData !== null &&
        'payload' in errorData &&
        typeof (errorData as Record<string, unknown>).payload === 'object'
      ) {
        const payloadObj = (errorData as { payload: Record<string, unknown> }).payload

        if (
          payloadObj !== null &&
          typeof payloadObj.iv === 'string' &&
          typeof payloadObj.tag === 'string' &&
          typeof payloadObj.data === 'string'
        ) {
          try {
            errorData = decryptPayload(errorData as EncryptedPayload)
          } catch {
            // If decryption fails, leave the original payload
          }
        }
      }

      return {
        success: false,
        status: error.status,
        data: errorData
      }
    }

    // Non-standard errors (e.g. fetch parsing problem, network error / no internet)
    if (error instanceof Error) {
      return {
        success: false,
        status: 500,
        data: { message: error.message }
      }
    }

    // Absolute fallback
    return {
      success: false,
      status: 500,
      data: { message: 'Wystąpił nieznany błąd' }
    }
  }
}
