// src/main/ipcHandlers.ts
import { registerLoginHandler } from './handlers/auth/login'
import { registerRegisterHandler } from './handlers/auth/register'
import { registerLogoutHandler } from './handlers/auth/logout'
// import { registerGetProfileHandler } from './handlers/users/getProfile'
import { registerDecryptHandler } from './handlers/crypto/decryptPayload'

export function registerIpcHandlers(): void {
  // Autoryzacja
  registerLoginHandler()
  registerRegisterHandler()
  registerLogoutHandler()

  // Użytkownicy
  // registerGetProfileHandler()

  // Inne
  registerDecryptHandler()
}
