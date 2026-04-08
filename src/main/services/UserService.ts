// Serwis singleton obsługujący operacje użytkownika (np. upload avatara, pobieranie profilu).
import { ipcMain } from 'electron'
import { coreService } from './CoreService'

// Odpowiedź zwracana, gdy wersja aplikacji jest nieobsługiwana.
const updateBlockedResponse = {
  success: false as const,
  message: 'Ta wersja aplikacji nie jest wspierana. Zaktualizuj aplikacje, aby kontynuowac.'
}

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
    ipcMain.handle('user:uploadAvatar', async (_event, userID: string | null) => {
      if (await coreService.isUpdateRequired()) {
        return updateBlockedResponse
      }
      const { uploadAvatar } = await import('../handlers/users/avatar')
      return await uploadAvatar(userID)
    })

    ipcMain.handle(
      'user:uploadAvatarByBuffer',
      async (
        _event,
        buffer: ArrayBuffer,
        fileName: string,
        mimeType: string,
        userId: string | null
      ) => {
        if (await coreService.isUpdateRequired()) {
          return updateBlockedResponse
        }
        const { uploadAvatarByBuffer } = await import('../handlers/users/avatar')
        return await uploadAvatarByBuffer(buffer, fileName, mimeType, userId)
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
