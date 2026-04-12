import { desktopCapturer, ipcMain, sharedTexture, WebFrameMain } from 'electron'
import { IScreenCapture, ScreenCapture, SharedTextureHandle } from '@maciejwojs/screen-capture'

// interface SharedTextureHandle {
//   ntHandle?: Buffer
//   nativePixmap?: any
//   ioSurface?: Buffer
// }

interface SharedTextureImportTextureInfo {
  pixelFormat: 'bgra' | 'rgba' | 'rgbaf16' | 'nv12'
  codedSize: { width: number; height: number }
  handle: SharedTextureHandle
}

export class ScreenService {
  private capturer: IScreenCapture | null = null
  private captureInterval: NodeJS.Timeout | null = null
  private activeFrames: { frame: WebFrameMain; wc: Electron.WebContents }[] = []
  private isProcessingFrame = false
  private readonly captureFps = 144

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

    ipcMain.handle('capture:start', () => {
      this.startCapture()
    })

    ipcMain.handle('capture:stop', () => {
      this.stopCapture()
    })

    ipcMain.on('capture:request-stream', (event) => {
      const frame = event.senderFrame
      const wc = event.sender
      if (frame && !this.activeFrames.some((f) => f.frame === frame)) {
        this.activeFrames.push({ frame, wc })
      }
    })

    ipcMain.on('capture:stop-stream', (event) => {
      const frame = event.senderFrame
      if (frame) {
        this.activeFrames = this.activeFrames.filter((f) => f.frame !== frame)
      }
    })
  }

  private startCapture(): void {
    if (!this.capturer) {
      this.capturer = new ScreenCapture()
    }
    this.capturer.start()

    if (!this.captureInterval) {
      this.captureInterval = setInterval(() => {
        this.processFrame()
      }, 1000 / this.captureFps)
    }
  }

  private stopCapture(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval)
      this.captureInterval = null
    }

    if (this.capturer) {
      this.capturer.stop()
      this.capturer = null
    }

    // Notify frames and close them
    this.activeFrames = []
    this.isProcessingFrame = false
  }

  private processFrame(): void {
    if (this.isProcessingFrame) return

    this.activeFrames = this.activeFrames.filter(({ frame, wc }) => {
      const wcValid = wc && !wc.isDestroyed()
      const frameValid = frame && typeof frame.isDestroyed === 'function' && !frame.isDestroyed()
      // Usuwamy ramkę z listy jeśli webContents załadował już nową ramkę główną
      // (co oznacza, że stara, ta z którą zaczynaliśmy, właśnie traci kontekst po reload/navigate)
      return wcValid && frameValid && frame === wc.mainFrame
    })
    if (!this.capturer || this.activeFrames.length === 0) return

    let info: SharedTextureImportTextureInfo | null = null

    if (typeof this.capturer.getSharedTextureInfo === 'function') {
      info = this.capturer.getSharedTextureInfo() as unknown as SharedTextureImportTextureInfo
    } else if (typeof this.capturer.getSharedHandle === 'function') {
      const legacy = this.capturer.getSharedHandle()
      if (legacy && legacy.handle) {
        let buffer: Buffer
        if (Buffer.isBuffer(legacy.handle)) {
          buffer = legacy.handle
        } else if (typeof legacy.handle === 'bigint' || typeof legacy.handle === 'number') {
          buffer = Buffer.allocUnsafe(8)
          buffer.writeBigUInt64LE(
            typeof legacy.handle === 'bigint' ? legacy.handle : BigInt(legacy.handle),
            0
          )
        } else {
          return
        }

        info = {
          pixelFormat: 'bgra',
          codedSize: { width: legacy.width, height: legacy.height },
          handle: { ntHandle: buffer }
        }
      }
    }

    if (!info || !info.handle) return

    try {
      this.isProcessingFrame = true
      const importedTexture = sharedTexture.importSharedTexture({ textureInfo: info })

      const sends = this.activeFrames.map(({ frame }) => {
        try {
          return sharedTexture.sendSharedTexture({
            frame,
            importedSharedTexture: importedTexture
          })
        } catch (e: unknown) {
          console.warn('[Capture] Ignored frame (disposed?):', e)
          this.activeFrames = this.activeFrames.filter((f) => f.frame !== frame)
          return Promise.reject(e)
        }
      })

      void Promise.allSettled(sends)
        .then((results) => {
          const allFailed = results.every((r) => r.status === 'rejected')

          if (allFailed) {
            const firstError = results.find((r) => r.status === 'rejected')
            console.error('[Capture] Błąd wysyłania sharedTexture do ramki:', firstError)
          }
        })
        .finally(() => {
          try {
            importedTexture.release()
          } catch (e) {
            console.error('[Capture] Błąd przy release() importedTexture w głównym wątku:', e)
          }
          this.isProcessingFrame = false
        })
    } catch (e) {
      console.error('[Capture] Główny błąd importSharedTexture:', e)
      this.isProcessingFrame = false
    }
  }
}

export const screenService = ScreenService.getInstance()
