import { desktopCapturer, ipcMain } from 'electron'

export class ScreenService {
  private constructor() {
    console.log('[ScreenService] Initializing service...')
  }

  private static instance: ScreenService

  public static getInstance(): ScreenService {
    if (!ScreenService.instance) {
      ScreenService.instance = new ScreenService()
    }
    return ScreenService.instance
  }

  public registerHandlers(): void {
    ipcMain.handle('desktop:get-sources', async () => {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 300, height: 200 }
      })

      return sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL()
      }))
    })
  }
}

export const screenService = ScreenService.getInstance()
