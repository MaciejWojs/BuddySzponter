import { authManager } from './authManager'
import { buildConfig, parseResponseData, tryDecryptData } from './utils/httpUtils'
import { handleAuthTokens, handleTokenRefresh } from './utils/authUtils'

const BASE_URL = 'http://localhost/api/v1'
const DEFAULT_TIMEOUT = 10000

export class HttpError<T = unknown> extends Error {
  constructor(
    public status: number,
    public data: T,
    message: string
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export interface ApiFetchInit extends RequestInit {
  timeout?: number
  _retry?: boolean
}

export type FetchResponse<T = unknown> = {
  status: number
  data: T
  headers: Headers
}

export async function apiFetch<T = unknown>(
  url: string,
  options: ApiFetchInit = {}
): Promise<FetchResponse<T>> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const token = authManager.getAccessToken()
  const config = buildConfig(options, controller, token)

  console.log('[API REQUEST]', { method: config.method || 'GET', url: fullUrl })

  try {
    const response = await fetch(fullUrl, config)
    clearTimeout(timeoutId)

    let responseData = await parseResponseData(response)

    if (!response.ok) {
      if (response.status === 401 && !options._retry) {
        const retryResponse = await handleTokenRefresh<T>(url, options, apiFetch)
        if (retryResponse) return retryResponse
      }
      throw new HttpError(response.status, responseData, `HTTP Error: ${response.status}`)
    }

    if (responseData) {
      responseData = tryDecryptData(responseData)
      handleAuthTokens(responseData, url)
    }

    return { status: response.status, data: responseData as T, headers: response.headers }
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new HttpError(408, null, 'Request timeout')
    }
    throw error
  }
}
