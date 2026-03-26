// main/utils/withAuth.ts
import { refresh } from '../../handlers/auth/refresh'

export const mock401Response = (message: string): Promise<Response> => {
  return Promise.resolve(
    new Response(JSON.stringify({ message }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  )
}

export async function withAuth(callback: () => Promise<Response>): Promise<Response> {
  const response = await callback()

  if (response.status === 401) {
    console.log('[withAuth] received 401. Attempting token refresh...')

    try {
      await refresh()

      console.log('[withAuth] Token refreshed. Retrying request...')
      const retryResponse = await callback()

      return retryResponse
    } catch (error) {
      console.error('[withAuth] Error during token refresh:', error)
      return response
    }
  }

  return response
}
