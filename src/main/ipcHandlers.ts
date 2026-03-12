// src/main/ipcHandlers.ts
import { registerLoginHandler } from './handlers/auth/login'
import { registerRegisterHandler } from './handlers/auth/register'
import { registerLogoutHandler } from './handlers/auth/logout'

export function registerIpcHandlers(): void {
  registerLoginHandler()
  registerRegisterHandler()
  registerLogoutHandler()
}
