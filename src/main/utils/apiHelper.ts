// src/main/utils/apiHelper.ts

import type { AxiosResponse, AxiosError } from 'axios'
import { decryptPayload, type EncryptedPayload } from '../decrypt-payload'

type ApiResult<T = unknown> =
  | { success: true; status: number; data: T }
  | { success: false; status: number; data: unknown }

export async function handleApiCall<T = unknown>(
  apiPromise: Promise<AxiosResponse<T>>
): Promise<ApiResult<T>> {
  try {
    const response = await apiPromise
    return { success: true, status: response.status, data: response.data }
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'isAxiosError' in error &&
      (error as AxiosError).isAxiosError
    ) {
      const axiosError = error as AxiosError
      let errorData = axiosError.response?.data || {
        message: axiosError.message || 'Wystąpił nieznany błąd'
      }
      // Odszyfrowanie błędu jeśli jest zaszyfrowany
      type EncryptedErrorPayload = { payload: { iv: string; tag: string; data: string } }
      if (
        errorData &&
        typeof errorData === 'object' &&
        'payload' in errorData &&
        typeof (errorData as { payload: unknown }).payload === 'object'
      ) {
        const payloadObj = (errorData as EncryptedErrorPayload).payload
        if (
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
        status: axiosError.response?.status || 500,
        data: errorData
      }
    } else if (error instanceof Error) {
      return {
        success: false,
        status: 500,
        data: { message: error.message }
      }
    } else {
      return {
        success: false,
        status: 500,
        data: { message: 'Wystąpił nieznany błąd' }
      }
    }
  }
}
