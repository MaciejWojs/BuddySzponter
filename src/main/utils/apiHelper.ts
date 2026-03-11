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
    // Łapanie błędu rzuconego przez apiClient (zarówno tych z serwera, jak i timeoutów 408)
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
            // Jeśli nie uda się odszyfrować, zostawiamy oryginalny payload
          }
        }
      }

      return {
        success: false,
        status: error.status,
        data: errorData
      }
    }

    // Błędy nietypowe (np. problem z parsowaniem w fetch, błąd sieci / brak internetu)
    if (error instanceof Error) {
      return {
        success: false,
        status: 500,
        data: { message: error.message }
      }
    }

    // Fallback absolutny
    return {
      success: false,
      status: 500,
      data: { message: 'Wystąpił nieznany błąd' }
    }
  }
}
