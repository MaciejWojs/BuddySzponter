import { HttpError } from './utils/httpErrors'
import { TokenManager } from './tokenManager' // Zmiana tutaj!owy import

export class ApiClient {
  private static instance: ApiClient
  private readonly baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost/api/v1'

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient()
    }
    return ApiClient.instance
  }

  public async fetch<T = unknown>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: unknown,
    isRetry = false
  ): Promise<{ status: number; data: unknown }> {
    const url = `${this.baseURL}${endpoint}`
    const headers = new Headers({ 'Content-Type': 'application/json' })

    const token = TokenManager.getInstance().getAccessToken() // Zmiana
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const config: RequestInit = { method, headers }

    if (data !== undefined) {
      config.body = JSON.stringify(data)
    }

    let response: Response

    try {
      response = await fetch(url, config)
    } catch {
      throw new HttpError(500, { message: 'Błąd połączenia z serwerem backendu' })
    }

    if (response.status === 401 && !isRetry) {
      await TokenManager.getInstance().refresh(this.baseURL)
      return this.fetch<T>(method, endpoint, data, true)

      return this.fetch<T>(method, endpoint, data, true)
    }

    let responseData: unknown = null
    try {
      if (response.status !== 204) {
        responseData = await response.json()
      }
    } catch {
      ///
    }

    if (!response.ok) {
      throw new HttpError(
        response.status,
        responseData || { message: 'Wystąpił nieznany błąd API' }
      )
    }

    return { status: response.status, data: responseData }
  }
}
