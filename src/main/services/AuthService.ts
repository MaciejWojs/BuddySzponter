import { ipcMain } from 'electron'
import { LoginInput, RegisterInput } from '../schemas/authSchemas'
import { register } from '../handlers/auth/register'
import { login } from '../handlers/auth/login'
import { secureStore } from '../store/secureStore'
import { authStore } from '../store/localStore'
import { logout } from '../handlers/auth/logout'
import { getCurrentUser } from '../handlers/auth/me'
import { jwtDecode } from 'jwt-decode'
import { refresh } from '../handlers/auth/refresh'

export class AuthService {
  private static instance: AuthService
  private refreshTimeout: NodeJS.Timeout | null = null

  private constructor() {
    console.log('[AuthService] Initializing service...')
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  // --- TOKEN MANAGEMENT ---

  async setAccessToken(token: string): Promise<void> {
    authStore.set('accessToken', token)

    if (token) {
      const decoded = jwtDecode(token) as { exp: number }
      const expTimeMs = decoded.exp * 1000
      const bufferMs = 15 * 1000
      const delayMs = expTimeMs - Date.now() - bufferMs

      if (delayMs > 0) {
        this.scheduleRefresh(delayMs)
      } else {
        refresh().catch((err) => {
          console.error('[AuthService] Immediate refresh failed:', err)
          this.clearTokens()
        })
      }
    } else {
      this.clearRefreshTimeout()
    }
  }

  getAccessToken(): string | null {
    return authStore.get('accessToken')
  }

  getRefreshToken(): string | undefined {
    return secureStore.getSecure('refreshToken')
  }

  setRefreshToken(token: string): void {
    secureStore.setSecure('refreshToken', token)
  }

  grabRefreshTokenCookie(cookies: string[]): boolean {
    if (cookies && cookies.length > 0) {
      const refreshTokenCookie = cookies.find((cookie) => cookie.startsWith('refreshToken='))

      if (refreshTokenCookie) {
        const rawValue = refreshTokenCookie.split(';')[0]
        const refreshToken = rawValue.split('=')[1]

        if (refreshToken) {
          this.setRefreshToken(refreshToken)
          return true
        }
      }
    }
    return false
  }

  clearTokens(): void {
    this.setAccessToken('')
    this.setRefreshToken('')
    this.clearRefreshTimeout()
  }

  private scheduleRefresh(delay: number): void {
    this.clearRefreshTimeout()

    // console.log(`[AuthService] Scheduling token refresh in ${delay / 1000} seconds.`)
    this.refreshTimeout = setTimeout(async () => {
      try {
        await refresh()
      } catch (error) {
        console.error('[AuthService] Scheduled refresh failed:', error)
        this.clearTokens()
      }
    }, delay)
  }

  private clearRefreshTimeout(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout)
      this.refreshTimeout = null
    }
  }

  // --- AUTHENTICATION METHODS ---

  public registerHandler(): void {
    ipcMain.handle('auth:register', async (_event, data: RegisterInput) => {
      return await register(data)
    })
    ipcMain.handle('auth:login', async (_event, data: LoginInput) => {
      return await login(data)
    })
    ipcMain.handle('auth:logout', async () => {
      return await logout()
    })
    ipcMain.handle('auth:me', async () => {
      return await getCurrentUser()
    })
  }
}

export const authService = AuthService.getInstance()
