// import fs from 'node:fs'
import { desktopCapturer, ipcMain, sharedTexture, WebFrameMain } from 'electron'
import { IScreenCapture, ScreenCapture } from '@maciejwojs/screen-capture'

export class ScreenService {
  private capturer: IScreenCapture | null = null
  private captureInterval: NodeJS.Timeout | null = null
  private activeFrames: { frame: WebFrameMain; wc: Electron.WebContents }[] = []
  private isProcessingFrame = false
  private readonly captureFps = 60
  private isHandleLogged = false
  private useCpuPath: boolean
  private lastSharedTextureInfoSignature: string | null = null
  private lastSharedTextureWarning: 'noInfo' | 'noHandle' | null = null

  private constructor() {
    console.log('[ScreenService] Initializing service...')

    this.useCpuPath = false
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

    ipcMain.handle('capture:should-use-cpu', () => {
      return this.useCpuPath
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

    let info: Electron.SharedTextureImportTextureInfo | null = null

    if (typeof this.capturer.getSharedTextureInfo === 'function') {
      info = this.capturer.getSharedTextureInfo() as Electron.SharedTextureImportTextureInfo | null

      const currentSignature = info
        ? `${info.pixelFormat}-${info.codedSize.width}x${info.codedSize.height}-${Object.keys(info.handle ?? {}).join(',')}`
        : 'no-info'

      if (currentSignature !== this.lastSharedTextureInfoSignature) {
        this.lastSharedTextureInfoSignature = currentSignature
        this.isHandleLogged = false
        this.lastSharedTextureWarning = null
      }

      if (!info) {
        this.useCpuPath = true
        if (this.lastSharedTextureWarning !== 'noInfo') {
          console.warn('[Capture] Nie można uzyskać sharedTexture info, przełączanie na CPU path')
          this.lastSharedTextureWarning = 'noInfo'
        }
        this.processFrameViaCpu()
        return
      } else {
        this.useCpuPath = false
      }

      if (!info.handle) {
        if (this.lastSharedTextureWarning !== 'noHandle') {
          console.warn('[Capture] Otrzymano info o sharedTexture, ale brak handle:', {
            pixelFormat: info.pixelFormat,
            codedSize: info.codedSize
          })
          this.lastSharedTextureWarning = 'noHandle'
        }
        return
      }

      if (!this.isHandleLogged) {
        console.log('[Capture] Otrzymano info o sharedTexture:', {
          pixelFormat: info.pixelFormat,
          codedSize: info.codedSize,
          handleKeys: Object.keys(info.handle)
        })

        console.log('[Capture] Szczegóły handle:', info.handle.nativePixmap, info.handle.ntHandle)
        this.isHandleLogged = true
      }
    }

    if (!info || !info.handle) return

    try {
      this.isProcessingFrame = true
      type SharedTextureSendArgs = Parameters<typeof sharedTexture.sendSharedTexture>[0]
      type ImportedSharedTexture = SharedTextureSendArgs['importedSharedTexture']
      const importedTexture = sharedTexture.importSharedTexture({
        textureInfo: info
      }) as ImportedSharedTexture

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

  private processFrameViaCpu(): void {
    const capturer = this.capturer
    const buffer = capturer?.getPixelData?.()
    if (!buffer) {
      return
    }

    const width = typeof capturer?.getWidth === 'function' ? capturer.getWidth() : 0
    const height = typeof capturer?.getHeight === 'function' ? capturer.getHeight() : 0
    const stride = typeof capturer?.getStride === 'function' ? capturer.getStride() : width * 4
    const format = typeof capturer?.getPixelFormat === 'function' ? capturer.getPixelFormat() : 12

    if (width === 0 || height === 0) {
      return
    }

    this.isProcessingFrame = true

    const framePayload = {
      width,
      height,
      stride,
      format,
      buffer
    }

    this.activeFrames.forEach(({ wc }) => {
      if (!wc.isDestroyed()) {
        try {
          wc.send('capture:raw-frame', framePayload)
        } catch (e) {
          console.warn('[Capture] Nie udało się wysłać surowej klatki:', e)
        }
      }
    })

    this.isProcessingFrame = false
  }
}

export const screenService = ScreenService.getInstance()
