// import fs from 'node:fs'
import { desktopCapturer, ipcMain, sharedTexture, WebFrameMain } from 'electron'
import { IScreenCapture, ScreenCapture } from '@maciejwojs/screen-capture'

export class ScreenService {
  private capturer: IScreenCapture | null = null
  private captureInterval: NodeJS.Timeout | null = null
  private activeFrames: { frame: WebFrameMain; wc: Electron.WebContents }[] = []
  private trackedWebContents = new Set<Electron.WebContents>()
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
    ipcMain.handle('capture:getFps', async () => {
      if (this.capturer && typeof this.capturer.getFps === 'function') {
        try {
          return await this.capturer.getFps()
        } catch (e) {
          console.error('[ScreenService] Error occurred while fetching FPS:', e)
          return null
        }
      }
      return null
    })
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
      if (!frame || !wc) return

      const frameDestroyed = typeof frame.isDestroyed === 'function' && frame.isDestroyed()
      if (frameDestroyed) return

      if (!this.activeFrames.some((f) => f.frame === frame)) {
        this.activeFrames.push({ frame, wc })
      }

      if (!this.trackedWebContents.has(wc)) {
        this.trackedWebContents.add(wc)
        wc.once('destroyed', () => {
          this.activeFrames = this.activeFrames.filter((f) => f.wc !== wc)
          this.trackedWebContents.delete(wc)
        })
        wc.once('render-process-gone', (_event, details) => {
          console.error('[Capture] Renderer process gone:', details.reason, details.exitCode)
          this.activeFrames = this.activeFrames.filter((f) => f.wc !== wc)
          this.trackedWebContents.delete(wc)
        })
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
      this.capturer = new ScreenCapture({ logLevel: 'debug' })
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

  private removeInactiveFrames(): void {
    this.activeFrames = this.activeFrames.filter(({ frame, wc }) => {
      const wcDestroyedOrCrashed =
        wc.isDestroyed() || (typeof wc.isCrashed === 'function' && wc.isCrashed())
      const frameDestroyed = typeof frame.isDestroyed === 'function' && frame.isDestroyed()
      return !wcDestroyedOrCrashed && !frameDestroyed && frame === wc.mainFrame
    })
  }

  private async processFrame(): Promise<void> {
    if (this.isProcessingFrame) return

    this.removeInactiveFrames()
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
        this.useCpuPath = false
      }

      if (!info) {
        this.useCpuPath = true
        if (this.lastSharedTextureWarning !== 'noInfo') {
          console.warn('[Capture] Nie można uzyskać sharedTexture info, przełączanie na CPU path')
          this.lastSharedTextureWarning = 'noInfo'
        }
        this.processFrameViaCpu()
        return
      }

      if (!info.handle) {
        if (this.lastSharedTextureWarning !== 'noHandle') {
          console.warn('[Capture] Otrzymano info o sharedTexture, ale brak handle:', {
            pixelFormat: info.pixelFormat,
            codedSize: info.codedSize
          })
          this.lastSharedTextureWarning = 'noHandle'
        }
        this.useCpuPath = true
        this.processFrameViaCpu()
        return
      }

      if (this.useCpuPath) {
        this.processFrameViaCpu()
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

      this.removeInactiveFrames()
      if (this.activeFrames.length === 0) {
        try {
          importedTexture.release()
        } catch (e) {
          console.error('[Capture] Błąd przy release() importedTexture w głównym wątku:', e)
        }
        this.isProcessingFrame = false
        return
      }

      const sendPromises = this.activeFrames.map(async ({ frame }) => {
        try {
          if (typeof frame.isDestroyed === 'function' && frame.isDestroyed()) {
            throw new Error('render frame is destroyed')
          }

          await sharedTexture.sendSharedTexture({
            frame,
            importedSharedTexture: importedTexture
          })
        } catch (e: unknown) {
          console.warn('[Capture] Frame error, removing', e)
          this.activeFrames = this.activeFrames.filter((f) => f.frame !== frame)
          throw e
        }
      })

      const results = await Promise.allSettled(sendPromises)
      const allFailed = results.every((r) => r.status === 'rejected')

      if (allFailed) {
        const firstError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
        const errorInfo = firstError?.reason
        const timeoutDetected =
          errorInfo instanceof Error && /transfer shared texture timed out/i.test(errorInfo.message)
        const disposedFrameDetected =
          errorInfo instanceof Error &&
          /render frame was disposed before WebFrameMain could be accessed/i.test(errorInfo.message)

        if (timeoutDetected || disposedFrameDetected) {
          console.warn('[Capture] Shared texture transfer failed, przełączam na ścieżkę CPU.')
          this.useCpuPath = true
          this.processFrameViaCpu()
        }

        console.error('[Capture] Błąd wysyłania sharedTexture do ramki:', firstError)
      }

      try {
        importedTexture.release()
      } catch (e) {
        console.error('[Capture] Błąd przy release() importedTexture w głównym wątku:', e)
      }
      this.isProcessingFrame = false
    } catch (e) {
      console.error('[Capture] Główny błąd importSharedTexture:', e)
      this.isProcessingFrame = false
    }
  }

  private processFrameViaCpu(): void {
    const capturer = this.capturer
    const buffer = capturer?.getPixelData?.('rgba')
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

    const srcBuffer =
      buffer instanceof ArrayBuffer
        ? new Uint8Array(buffer)
        : new Uint8Array(buffer.buffer as ArrayBuffer, buffer.byteOffset, buffer.byteLength)

    const pixelData =
      stride === width * 4
        ? new Uint8ClampedArray(srcBuffer.buffer, srcBuffer.byteOffset, width * height * 4)
        : (() => {
            const result = new Uint8ClampedArray(width * height * 4)
            for (let row = 0; row < height; row++) {
              const srcRowOffset = row * stride
              const dstRowOffset = row * width * 4
              result.set(srcBuffer.subarray(srcRowOffset, srcRowOffset + width * 4), dstRowOffset)
            }
            return result
          })()

    const framePayload = {
      width,
      height,
      stride,
      format,
      buffer: pixelData
    }

    this.activeFrames = this.activeFrames.filter(({ frame, wc }) => {
      const wcDestroyedOrCrashed =
        wc.isDestroyed() || (typeof wc.isCrashed === 'function' && wc.isCrashed())
      const frameDestroyed = typeof frame.isDestroyed === 'function' && frame.isDestroyed()
      return !wcDestroyedOrCrashed && !frameDestroyed
    })

    this.activeFrames.forEach(({ wc }) => {
      try {
        wc.send('capture:raw-frame', framePayload)
      } catch (e) {
        console.warn('[Capture] Nie udało się wysłać surowej klatki:', e)
      }
    })

    this.isProcessingFrame = false
  }
}

export const screenService = ScreenService.getInstance()
