// Serwis odpowiedzialny za obsługę logowania, rejestracji, wylogowania i zarządzania tokenami JWT.
import { ipcMain } from 'electron'
import { register } from '../handlers/auth/register'
import { login } from '../handlers/auth/login'
import { secureStore } from '../store/secureStore'
import { authStore } from '../store/localStore'
import { logout } from '../handlers/auth/logout'
import { getCurrentUser } from '../handlers/auth/me'
import { jwtDecode } from 'jwt-decode'
import { refresh } from '../handlers/auth/refresh'
import { UserResponseSchema } from '../../shared/schemas/user'
import { coreService } from './CoreService'
import { RegisterRequest, LoginRequest } from '../schemas/authSchemas'

// Odpowiedź zwracana, gdy wersja aplikacji jest nieobsługiwana.
const updateBlockedResponse = {
  success: false as const,
  message: 'Ta wersja aplikacji nie jest wspierana. Zaktualizuj aplikacje, aby kontynuowac.'
}

// Klasa singleton obsługująca logikę autoryzacji użytkownika (logowanie, rejestracja, wylogowanie, odświeżanie tokenów).
export class AuthService {
  // Instancja singletona serwisu.
  private static instance: AuthService
  // Timer do automatycznego odświeżania tokenu JWT.
  private refreshTimeout: NodeJS.Timeout | null = null
  // Dane aktualnie zalogowanego użytkownika.
  public currentUser: UserResponseSchema | null = null

  private constructor() {
    console.log('[AuthService] Initializing service...')
    this.currentUser = this.getCurrentUserData()
  }

  // Zwraca instancję singletona serwisu.
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  // --- ZARZĄDZANIE TOKENAMI ---

  // Ustawia nowy token JWT i planuje jego automatyczne odświeżenie.
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
    secureStore.clearRefreshToken()
    this.clearRefreshTimeout()

    this.setUserData(null)
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

  private saveUserData(userData: UserResponseSchema): void {
    authStore.set('user', userData)
    this.currentUser = userData
  }

  public setUserData(userData: UserResponseSchema | null): void {
    authStore.set('user', userData)
    this.currentUser = userData
  }

  public getCurrentUserData(): UserResponseSchema | null {
    return authStore.get('user')
  }

  // --- AUTHENTICATION METHODS ---

  public registerHandler(): void {
    ipcMain.handle('auth:register', async (_event, data: RegisterRequest) => {
      if (await coreService.isUpdateRequired()) {
        return updateBlockedResponse
      }
      return await register(data)
    })
    ipcMain.handle('auth:login', async (_event, data: LoginRequest) => {
      if (await coreService.isUpdateRequired()) {
        return updateBlockedResponse
      }
      return await login(data)
    })
    ipcMain.handle('auth:logout', async () => {
      if (await coreService.isUpdateRequired()) {
        return updateBlockedResponse
      }
      return await logout()
    })
    ipcMain.handle('auth:me', async () => {
      if (await coreService.isUpdateRequired()) {
        return updateBlockedResponse
      }
      const result = await getCurrentUser()
      if (result.success && result.data) {
        this.saveUserData(result.data)
      }
      return result
    })
  }
}

export const authService = AuthService.getInstance()
