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
    ipcMain.handle('user:uploadAvatar', async (_event, userId: string) => {
      const { uploadAvatar } = await import('../handlers/users/avatar')
      return await uploadAvatar(userId)
    })

    // ZMIANA: Nasłuchujemy na buffer
    ipcMain.handle(
      'user:uploadAvatarByBuffer',
      async (_event, userId: string, buffer: ArrayBuffer, fileName: string, mimeType: string) => {
        const { uploadAvatarByBuffer } = await import('../handlers/users/avatar')
        return await uploadAvatarByBuffer(userId, buffer, fileName, mimeType)
      }
    )
  }
}

export const userService = UserService.getInstance()
