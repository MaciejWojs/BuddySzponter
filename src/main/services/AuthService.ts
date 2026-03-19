import { ipcMain } from 'electron'
import { RegisterInput } from '../schemas/authSchemas'
import { register } from '../handlers/auth/register'
import { login } from '../handlers/auth/login'

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

  // --- AUTHENTICATION METHODS ---

  public registerHandler(): void {
    ipcMain.handle('auth:register', async (_event, data: RegisterInput) => {
      return await register(data)
    })
    ipcMain.handle('auth:login', async (_event, data) => {
      return await login(data)
    })
  }
}

export const authService = AuthService.getInstance()
