// src/main/utils/apiHelper.ts
import type { AxiosResponse, AxiosError } from 'axios'

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
      return {
        success: false,
        status: axiosError.response?.status || 500,
        data: axiosError.response?.data || {
          message: axiosError.message || 'Wystąpił nieznany błąd'
        }
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
