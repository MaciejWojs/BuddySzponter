import { ipcMain } from 'electron'
import { LoginInput, RegisterInput } from '../schemas/authSchemas'
import { register } from '../handlers/auth/register'
import { login } from '../handlers/auth/login'
import { API_ROUTES } from '../apiRoutes'
import { secureStore } from '../store/secureStore'
import { authStore } from '../store/localStore'

export class AuthService {
  private static instance: AuthService

  private constructor() {
    console.log('[AuthService] Initializing service...')
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }
  setAccessToken(token: string): void {
    authStore.set('accessToken', token)
  }
  getAccessToken(): string | null {
    return authStore.get('accessToken')
  }

  public catchRefreshToken(path: string, response: Response): void {
    if (path === API_ROUTES.AUTH.LOGIN) {
      try {
        const setCookieHeaders = response.headers.getSetCookie()

        if (setCookieHeaders && setCookieHeaders.length > 0) {
          const refreshTokenCookie = setCookieHeaders.find((cookie) =>
            cookie.startsWith('refreshToken=')
          )

          if (refreshTokenCookie) {
            const rawValue = refreshTokenCookie.split(';')[0]
            const refreshToken = rawValue.split('=')[1]

            if (refreshToken) {
              secureStore.setSecure('refreshToken', refreshToken)
            }
          }
        }
      } catch (e) {
        console.warn("Can't parse refresh token from headers:", e)
      }
    }
  }

  getRefreshToken(): string | undefined {
    return secureStore.getSecure('refreshToken')
  }

  // --- AUTHENTICATION METHODS ---

  public registerHandler(): void {
    ipcMain.handle('auth:register', async (_event, data: RegisterInput) => {
      return await register(data)
    })
    ipcMain.handle('auth:login', async (_event, data: LoginInput) => {
      return await login(data)
    })
  }
}

export const authService = AuthService.getInstance()
