import { ipcMain } from 'electron'

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

  public registerHandler(): void {
    ipcMain.handle('user:uploadAvatar', async () => {
      const { uploadAvatar } = await import('../handlers/users/avatar')
      return await uploadAvatar()
    })

    // ZMIANA: Nasłuchujemy na buffer
    ipcMain.handle(
      'user:uploadAvatarByBuffer',
      async (_event, buffer: ArrayBuffer, fileName: string, mimeType: string) => {
        const { uploadAvatarByBuffer } = await import('../handlers/users/avatar')
        return await uploadAvatarByBuffer(buffer, fileName, mimeType)
      }
    )
  }
}

export const userService = UserService.getInstance()
