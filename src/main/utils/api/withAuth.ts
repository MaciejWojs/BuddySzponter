import { refresh } from '../../handlers/auth/refresh'

let refreshPromise: Promise<void> | null = null

export async function withAuth(callback: () => Promise<Response>): Promise<Response> {
  const response = await callback()

  if (response.status === 401) {
    console.log('[withAuth] received 401. Attempting token refresh...')

    try {
      if (!refreshPromise) {
        refreshPromise = refresh().finally(() => {
          refreshPromise = null
        })
      }

      await refreshPromise

      console.log('[withAuth] Token refreshed. Retrying request...')
      return await callback()
    } catch {
      console.error('[withAuth] Error during token refresh')
      return response
    }
  }

  return response
}
