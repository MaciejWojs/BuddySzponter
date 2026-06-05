// Serwis singleton obsługujący operacje użytkownika (np. upload avatara, pobieranie profilu).
import { ipcMain } from 'electron'
import { coreService } from './CoreService'
import { uploadAvatar, uploadAvatarByBuffer } from '../handlers/user/avatar'
import { APP_ERRORS } from '../../shared/constants/errors'

const updateBlockedResponse = APP_ERRORS.SYSTEM.UPDATE_REQUIRED

// Klasa singleton obsługująca rejestrację handlerów IPC dla operacji użytkownika (avatar, profil).
export class UserService {
  private static instance: UserService

  private constructor() {
    console.log('[UserService] Initializing service...')
  }

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService()
    }
    return UserService.instance
  }

  // Rejestruje handlery IPC dla operacji użytkownika (avatar, pobieranie profilu).
  public registerHandler(): void {
    ipcMain.handle('user:uploadAvatar', async () => {
      if (await coreService.isUpdateRequired()) {
        return updateBlockedResponse
      }
      return await uploadAvatar()
    })

    ipcMain.handle(
      'user:uploadAvatarByBuffer',
      async (_event, buffer: ArrayBuffer, fileName: string, mimeType: string) => {
        if (await coreService.isUpdateRequired()) {
          return updateBlockedResponse
        }
        return await uploadAvatarByBuffer(buffer, fileName, mimeType)
      }
    )

    ipcMain.handle('user:getCurrentUser', async () => {
      if (await coreService.isUpdateRequired()) {
        return updateBlockedResponse
      }
      const { getCurrentUser } = await import('../handlers/auth/me')
      const result = await getCurrentUser()
      return result
    })
  }
}

export const userService = UserService.getInstance()
