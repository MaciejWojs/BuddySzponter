import { ipcMain } from 'electron'
import { LoginInput, RegisterInput } from '../schemas/authSchemas'
import { register } from '../handlers/auth/register'
import { login } from '../handlers/auth/login'
import { secureStore } from '../store/secureStore'
import { authStore } from '../store/localStore'
import { logout } from '../handlers/auth/logout'
import { getCurrentUser } from '../handlers/auth/me'

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
    ipcMain.handle('auth:logout', async () => {
      return await logout()
    })
    ipcMain.handle('auth:me', async () => {
      return await getCurrentUser()
    })
  }
}

export const authService = AuthService.getInstance()
