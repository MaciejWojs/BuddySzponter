import { desktopCapturer, ipcMain, sharedTexture, WebFrameMain } from 'electron'
import { IScreenCapture, ScreenCapture } from '@maciejwojs/screen-capture'

interface SharedTextureHandle {
  ntHandle?: Buffer
  nativePixmap?: any
  ioSurface?: Buffer
}

interface SharedTextureImportTextureInfo {
  pixelFormat: 'bgra' | 'rgba' | 'rgbaf16' | 'nv12'
  codedSize: { width: number; height: number }
  handle: SharedTextureHandle
}

export class ScreenService {
  private capturer: IScreenCapture | null = null
  private captureInterval: NodeJS.Timeout | null = null
  private activeFrames: WebFrameMain[] = []

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
      if (frame && !this.activeFrames.includes(frame)) {
        this.activeFrames.push(frame)
      }
    })

    ipcMain.on('capture:stop-stream', (event) => {
      const frame = event.senderFrame
      if (frame) {
        this.activeFrames = this.activeFrames.filter((f) => f !== frame)
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
      }, 1000 / 60) // 60 FPS target
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
  }

  private processFrame(): void {
    this.activeFrames = this.activeFrames.filter(frame => frame !== null && typeof frame.isDestroyed === 'function' && !frame.isDestroyed())
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
          buffer.writeBigUInt64LE(typeof legacy.handle === 'bigint' ? legacy.handle : BigInt(legacy.handle), 0)
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
      const importedTexture = sharedTexture.importSharedTexture({ textureInfo: info })

      Promise.all(
        this.activeFrames.map((frame) =>
          sharedTexture.sendSharedTexture({
            frame,
            importedSharedTexture: importedTexture
          })
        )
      )
        .catch((e) => console.error('[Capture] Błąd wysyłania sharedTexture do ramki:', e))
        .finally(() => {
          importedTexture.release()
        })
    } catch (e) {
      console.error('[Capture] Główny błąd importSharedTexture:', e)
    }
  }
}

export const screenService = ScreenService.getInstance()
