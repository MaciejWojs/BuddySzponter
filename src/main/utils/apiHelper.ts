import { z } from 'zod'
import { HttpError } from './httpErrors'
import { ApiResult } from '../schemas/apiResultSchema'
import { TokenManager } from '../tokenManager'
import { decryptPayload } from '../decrypt-payload'
import { EncryptedPayload } from '../schemas/encryptedPayloadSchema'

export interface HandleApiOptions<T> {
  responseSchema?: z.ZodSchema<T>
  decrypt?: boolean
  saveTokens?: boolean
}

export class ApiHelper {
  public static async handleApiCall<T>(
    requestPromise: Promise<{ status: number; data: unknown }>,
    options: HandleApiOptions<T> = {}
  ): Promise<ApiResult<T>> {
    try {
      const response = await requestPromise
      const status = response.status
      let data = response.data

      // 1. Optional recursive decryption from Hono
      if (options.decrypt && data) {
        let tryDecrypt = true
        while (
          tryDecrypt &&
          typeof data === 'object' &&
          data !== null &&
          'payload' in data &&
          data.payload &&
          typeof data.payload === 'object' &&
          'iv' in data.payload &&
          'tag' in data.payload &&
          'data' in data.payload
        ) {
          try {
            const encryptedData = data as EncryptedPayload
            data = decryptPayload(encryptedData)
          } catch (e) {
            if (import.meta.env.DEV) {
              console.error('Decryption failed:', e)
            }
            tryDecrypt = false
          }
        }
      }

      // Log data after decryption, before validation
      if (import.meta.env.DEV) {
        console.log('API response after decryption:', data)
      }
      // 2. Optional token saving (after decryption!)
      if (options.saveTokens && typeof data === 'object' && data !== null) {
        const tokenData = data as { accessToken?: string; refreshToken?: string }

        if (tokenData.accessToken) TokenManager.getInstance().setAccessToken(tokenData.accessToken)
        if (tokenData.refreshToken)
          TokenManager.getInstance().setRefreshToken(tokenData.refreshToken)

        delete (data as Record<string, unknown>).accessToken
        delete (data as Record<string, unknown>).refreshToken
      }

      if (options.responseSchema) {
        const temp = options.responseSchema.safeParse(data)
        console.log('API response validation result:', temp)
        if (temp.success) {
          data = temp
        } else {
          if (import.meta.env.DEV) {
            console.error('Response validation failed:', temp.error.issues)
          }
        }
      }

      return { success: true, status, data: data as T }
    } catch (error: unknown) {
      if (error instanceof HttpError) {
        return { success: false, status: error.status, error: error.data }
      }

      if (error instanceof z.ZodError) {
        const zodError = error as z.ZodError
        if (import.meta.env.DEV) {
          console.error('Backend data validation error:', zodError.issues)
        }
        return {
          success: false,
          status: 422,
          error: { message: 'Invalid data format', details: zodError.issues }
        }
      }

      if (import.meta.env.DEV) {
        console.error('Critical API error:', error)
      }
      const errMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      return { success: false, status: 500, error: { message: errMessage } }
    }
  }
}
