// screen-service.ts
import { desktopCapturer, ipcMain, sharedTexture, WebFrameMain } from 'electron'
import { IScreenCapture, ScreenCapture, FrameUpdate } from '@maciejwojs/screen-capture'

export class ScreenService {
  private capturer: IScreenCapture | null = null
  private activeFrames: { frame: WebFrameMain; wc: Electron.WebContents }[] = []
  private isProcessingFrame = false
  // Flagi pomocnicze do logów – zapobiegają spamowaniu konsoli
  private isHandleLogged = false
  private lastSharedTextureInfoSignature: string | null = null
  private lastSharedTextureWarning: 'noInfo' | 'noHandle' | null = null
  private useCpuPath = false
  private cachedSharedTexture: ReturnType<typeof sharedTexture.importSharedTexture> | null = null

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
    console.log('[ScreenService] Registering IPC handlers...')

    ipcMain.handle('capture:getFps', async () => {
      console.debug('[IPC] capture:getFps called')
      if (this.capturer && typeof this.capturer.getFps === 'function') {
        try {
          const fps = await this.capturer.getFps()
          console.debug(`[IPC] capture:getFps returning ${fps}`)
          return fps
        } catch (e) {
          console.error('[ScreenService] Error occurred while fetching FPS:', e)
          return null
        }
      }
      console.debug('[IPC] capture:getFps - no capturer or method missing')
      return null
    })

    ipcMain.handle('desktop:get-sources', async () => {
      console.debug('[IPC] desktop:get-sources called')
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 300, height: 200 }
      })
      console.debug(`[IPC] desktop:get-sources returned ${sources.length} sources`)
      return sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL()
      }))
    })

    ipcMain.handle('capture:start', async () => {
      console.log('[IPC] capture:start called')
      await this.startCapture()
    })

    ipcMain.handle('capture:stop', () => {
      console.log('[IPC] capture:stop called')
      this.stopCapture()
    })

    ipcMain.handle('capture:should-use-cpu', () => {
      console.debug(`[IPC] capture:should-use-cpu returning ${this.useCpuPath}`)
      return this.useCpuPath
    })

    ipcMain.handle('capture:next-monitor', async () => {
      console.log('[IPC] capture:next-monitor called')
      await this.nextMonitor()
    })

    ipcMain.on('capture:request-stream', (event) => {
      const frame = event.senderFrame
      const wc = event.sender
      console.debug(
        `[IPC] capture:request-stream from frame ${frame?.routingId}, webContents ${wc?.id}`
      )
      if (frame && !this.activeFrames.some((f) => f.frame === frame)) {
        this.activeFrames.push({ frame, wc })
        console.debug(`[IPC] Added frame, now ${this.activeFrames.length} active frames`)
      } else {
        console.debug('[IPC] Frame already active or invalid')
      }
    })

    ipcMain.on('capture:stop-stream', (event) => {
      const frame = event.senderFrame
      console.debug(`[IPC] capture:stop-stream from frame ${frame?.routingId}`)
      if (frame) {
        const before = this.activeFrames.length
        this.activeFrames = this.activeFrames.filter((f) => f.frame !== frame)
        console.debug(
          `[IPC] Removed frame, active frames: ${before} -> ${this.activeFrames.length}`
        )
      }
    })
  }

  // ------------------------------------------------------------------
  // Start / Stop z użyciem onFrame
  // ------------------------------------------------------------------
  private async startCapture(): Promise<void> {
    console.log('[ScreenService] Starting screen capture...')
    if (!this.capturer) {
      console.log('[ScreenService] Creating new ScreenCapture instance with logLevel debug')
      this.capturer = new ScreenCapture({
        // logLevel: 'debug',
        disableLogging: true
      })
    }

    // console.log('[ScreenService] Forcing backend to dxgi')
    // this.capturer.forceBackend('gdi')
    // this.capturer.forceBackend('dxgi')

    const monitorCount = await this.capturer.getMonitorCount()
    console.log(`[ScreenService] Detected ${monitorCount} monitor(s) available for capture`)

    // Uruchamiamy przechwytywanie i od razu rejestrujemy callback
    console.log('[ScreenService] Calling capturer.start()')
    await this.capturer.start()
    // await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log('[ScreenService] Registering onFrame callback')
    this.capturer.onFrame(this.handleFrame)

    console.log('[ScreenService] Capture started successfully')

    setTimeout(async () => {
      await this.nextMonitor()
    }, 15000)
  }

  public async nextMonitor(): Promise<void> {
    if (this.capturer) {
      console.log('[ScreenService] Changing to next monitor, clearing old frames/textures...')
      this.releaseCachedSharedTexture()

      this.isProcessingFrame = false
      if (typeof this.capturer.nextMonitor === 'function') {
        await this.capturer.nextMonitor()
      } else {
        console.warn(
          '[ScreenService] capturer.nextMonitor is not available in the current screen-capture plugin version'
        )
      }
    }
  }

  private stopCapture(): void {
    console.log('[ScreenService] Stopping screen capture...')
    if (this.capturer) {
      console.log('[ScreenService] Removing onFrame callback and stopping capturer')
      this.capturer.offFrame()
      this.capturer.stop()
      this.capturer = null
    }

    this.releaseCachedSharedTexture()

    const framesCount = this.activeFrames.length
    this.activeFrames = []
    this.isProcessingFrame = false
    console.log(`[ScreenService] Capture stopped, cleared ${framesCount} active frames`)
  }

  private releaseCachedSharedTexture(): void {
    if (!this.cachedSharedTexture) return

    try {
      this.cachedSharedTexture.release()
      console.debug('[Capture] Released cached shared texture')
    } catch (e) {
      console.error('[Capture] Błąd przy release() cached shared texture:', e)
    } finally {
      this.cachedSharedTexture = null
      this.lastSharedTextureInfoSignature = null
    }
  }

  // ------------------------------------------------------------------
  // Callback wywoływany dla każdej nowej klatki
  // ------------------------------------------------------------------
  private handleFrame = (frame: FrameUpdate): void => {
    const beforeFilter = this.activeFrames.length
    // Oczyszczamy listę aktywnych ramek
    this.activeFrames = this.activeFrames.filter(({ frame, wc }) => {
      const wcValid = wc && !wc.isDestroyed()
      const frameValid = frame && typeof frame.isDestroyed === 'function' && !frame.isDestroyed()
      const isValid = wcValid && frameValid && frame === wc.mainFrame
      if (!isValid) {
        console.debug('[Capture] Removing invalid frame (webContents destroyed or frame changed)')
      }
      return isValid
    })

    if (this.activeFrames.length !== beforeFilter) {
      console.debug(
        `[Capture] Filtered active frames: ${beforeFilter} -> ${this.activeFrames.length}`
      )
    }

    if (this.activeFrames.length === 0) {
      console.debug('[Capture] No active frames, skipping frame processing')
      return
    }

    // --- Ścieżka GPU (shared texture) ---
    if (frame.sharedTextureInfo) {
      const info = frame.sharedTextureInfo
      const currentSignature = `${info.pixelFormat}-${info.codedSize.width}x${info.codedSize.height}-${Object.keys(info.handle ?? {}).join(',')}`

      if (currentSignature !== this.lastSharedTextureInfoSignature) {
        console.log(`[Capture] New shared texture signature: ${currentSignature}`)
        this.lastSharedTextureInfoSignature = currentSignature
        this.lastSharedTextureWarning = null
      }

      if (!info.handle) {
        this.releaseCachedSharedTexture()
        this.useCpuPath = true
        if (this.lastSharedTextureWarning !== 'noHandle') {
          console.warn('[Capture] Otrzymano info o sharedTexture, ale brak handle:', {
            pixelFormat: info.pixelFormat,
            codedSize: info.codedSize
          })
          this.lastSharedTextureWarning = 'noHandle'
        }
        this.sendCpuFrame(frame)
        return
      }

      this.useCpuPath = false
      if (!this.isHandleLogged) {
        console.log('[Capture] Otrzymano info o sharedTexture:', {
          pixelFormat: info.pixelFormat,
          codedSize: info.codedSize,
          handleKeys: Object.keys(info.handle)
        })
        this.isHandleLogged = true
      }

      console.debug('[Capture] Importing shared texture and sending to frames...')
      try {
        const isNewTexture =
          currentSignature !== this.lastSharedTextureInfoSignature || !this.cachedSharedTexture

        if (isNewTexture) {
          this.releaseCachedSharedTexture()
          this.cachedSharedTexture = sharedTexture.importSharedTexture({
            textureInfo: info as Electron.SharedTextureImportTextureInfo
          })
          this.lastSharedTextureInfoSignature = currentSignature
          console.debug('[Capture] Shared texture imported successfully')
        }

        if (!this.cachedSharedTexture) {
          console.warn('[Capture] Brak zaimportowanej sharedTexture, przechodzę do CPU fallback')
          this.sendCpuFrame(frame)
          return
        }

        const importedTexture = this.cachedSharedTexture
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

        console.debug(`[Capture] Sending shared texture to ${sends.length} frames`)
        void Promise.allSettled(sends).then((results) => {
          const allFailed = results.every((r) => r.status === 'rejected')
          if (allFailed) {
            const firstError = results.find((r) => r.status === 'rejected')
            console.error('[Capture] Błąd wysyłania sharedTexture do ramki:', firstError)
          } else {
            const succeeded = results.filter((r) => r.status === 'fulfilled').length
            console.debug(
              `[Capture] Shared texture sent: ${succeeded} succeeded, ${results.length - succeeded} failed`
            )
          }
        })
      } catch (e) {
        console.error('[Capture] Główny błąd importSharedTexture:', e)
        this.releaseCachedSharedTexture()
      }

      return
    }

    // --- Fallback na CPU (surowe bajty) ---
    if (frame.pixelData) {
      this.releaseCachedSharedTexture()
      console.debug('[Capture] No shared texture info, using CPU path (pixelData)')
      this.useCpuPath = true
      this.sendCpuFrame(frame)
    } else {
      console.warn('[Capture] Frame has neither sharedTextureInfo nor pixelData')
    }
  }

  // ------------------------------------------------------------------
  // Wysyłanie surowych pikseli (ścieżka CPU)
  // ------------------------------------------------------------------
  private sendCpuFrame(frame: FrameUpdate): void {
    const buffer = frame.pixelData
    const width = frame.width
    const height = frame.height
    const stride = frame.stride
    const format = frame.pixelFormat

    if (!buffer || width === 0 || height === 0) {
      console.warn('[Capture] Invalid CPU frame data - skipping')
      return
    }

    console.debug(
      `[Capture] Sending CPU frame ${width}x${height}, stride=${stride}, buffer size=${buffer.byteLength}, format=${format}`
    )

    if (this.isProcessingFrame) {
      console.debug('[Capture] CPU frame already processing, skipping duplicate send')
      return
    }

    this.isProcessingFrame = true

    // Wydzielamy czysty ArrayBuffer z Node.js Buffer / Uint8Array.
    // slice() na ArrayBuffer tworzy kopię, co zapobiega problemom z współdzieleniem pamięci capturera,
    // a następnie przenosimy (transfer) go do Renderera bez kopiowania przez mostek IPC (Zero-copy).
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    )

    let sent = 0

    for (let i = 0; i < this.activeFrames.length; i++) {
      const { wc } = this.activeFrames[i]
      if (!wc.isDestroyed()) {
        try {
          // Obiekty Transferable mogą być przeniesione tylko raz.
          // W przypadku wielu okien, klonujemy bufor dla wszystkich poza ostatnim,
          // aby każde okno otrzymało własną instancję bufora bez blokowania pozostałych.
          const isLast = i === this.activeFrames.length - 1
          const bufferToTransfer = isLast ? arrayBuffer : arrayBuffer.slice(0)

          const payload = {
            width: frame.width,
            height: frame.height,
            stride: frame.stride,
            format: frame.pixelFormat,
            timestamp: frame.timestamp,
            buffer: bufferToTransfer
          }

          // W procesie Main Electrona, metoda postMessage obsługuje transfer jedynie dla MessagePortMain.
          // ArrayBuffer nie może być "transferowany" w ten sposób do Renderera (ograniczenie API Electrona).
          // Dane zostaną przesłane automatycznie przy użyciu wydajnego algorytmu Structured Clone.
          wc.postMessage('capture:raw-frame', payload)
          sent++
        } catch (e) {
          console.warn('[Capture] Nie udało się wysłać surowej klatki:', e)
        }
      } else {
        console.debug('[Capture] Skipping destroyed webContents')
      }
    }

    console.debug(
      `[Capture] CPU frame sent to ${sent} of ${this.activeFrames.length} active frames`
    )

    this.isProcessingFrame = false
  }
}

export const screenService = ScreenService.getInstance()
