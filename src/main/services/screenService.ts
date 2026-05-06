// screen-service.ts
import { desktopCapturer, ipcMain, sharedTexture, WebFrameMain } from 'electron'
import { IScreenCapture, ScreenCapture, FrameUpdate } from '@maciejwojs/screen-capture'
import { inputService } from './inputService'

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class ScreenService {
  private capturer: IScreenCapture | null = null
  private activeFrames: { frame: WebFrameMain; wc: Electron.WebContents }[] = []
  private isProcessingFrame = false
  private monitorCount = 0
  private currentMonitorIndex = 0
  private isHandleLogged = false
  private lastSharedTextureInfoSignature: string | null = null
  private lastSharedTextureWarning: 'noInfo' | 'noHandle' | null = null
  private useCpuPath = false
  private cachedSharedTexture: ReturnType<typeof sharedTexture.importSharedTexture> | null = null
  private logLevel: LogLevel = LogLevel.INFO

  private constructor() {
    this.log(LogLevel.INFO, '[ScreenService] Initializing service...')
  }

  //@ts-ignore - console also has any[]
  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (level > this.logLevel) return

    switch (level) {
      case LogLevel.ERROR:
        console.error(message, ...args)
        break
      case LogLevel.WARN:
        console.warn(message, ...args)
        break
      case LogLevel.INFO:
        console.log(message, ...args)
        break
      case LogLevel.DEBUG:
        console.debug(message, ...args)
        break
    }
  }

  private static instance: ScreenService
  public static getInstance(): ScreenService {
    if (!ScreenService.instance) {
      ScreenService.instance = new ScreenService()
    }
    return ScreenService.instance
  }

  public getCurrentMonitorIndex(): number {
    return this.capturer && typeof this.capturer.getCurrentMonitorIndex === 'function'
      ? this.capturer.getCurrentMonitorIndex()
      : this.currentMonitorIndex
  }

  public registerHandlers(): void {
    this.log(LogLevel.INFO, '[ScreenService] Registering IPC handlers...')

    ipcMain.handle('capture:getFps', async () => {
      this.log(LogLevel.DEBUG, '[IPC] capture:getFps called')
      if (this.capturer && typeof this.capturer.getFps === 'function') {
        try {
          const fps = await this.capturer.getFps()
          this.log(LogLevel.DEBUG, `[IPC] capture:getFps returning ${fps}`)
          return fps
        } catch (e) {
          this.log(LogLevel.ERROR, '[ScreenService] Error occurred while fetching FPS:', e)
          return null
        }
      }
      this.log(LogLevel.DEBUG, '[IPC] capture:getFps - no capturer or method missing')
      return null
    })

    ipcMain.handle('desktop:get-sources', async () => {
      this.log(LogLevel.DEBUG, '[IPC] desktop:get-sources called')
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 300, height: 200 }
      })
      this.log(LogLevel.DEBUG, `[IPC] desktop:get-sources returned ${sources.length} sources`)
      return sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL()
      }))
    })

    ipcMain.handle('capture:start', async () => {
      this.log(LogLevel.INFO, '[IPC] capture:start called')
      await this.startCapture()
    })

    ipcMain.handle('capture:stop', () => {
      this.log(LogLevel.INFO, '[IPC] capture:stop called')
      this.stopCapture()
    })

    ipcMain.handle('capture:should-use-cpu', () => {
      this.log(LogLevel.DEBUG, `[IPC] capture:should-use-cpu returning ${this.useCpuPath}`)
      return this.useCpuPath
    })

    ipcMain.handle('capture:next-monitor', async () => {
      this.log(LogLevel.INFO, '[IPC] capture:next-monitor called')
      await this.nextMonitor()
    })

    ipcMain.handle('capture:get-monitor-state', () => {
      return {
        count: this.monitorCount,
        currentIndex: this.currentMonitorIndex
      }
    })

    ipcMain.on('capture:request-stream', (event) => {
      const frame = event.senderFrame
      const wc = event.sender
      this.log(LogLevel.DEBUG, `[IPC] capture:request-stream from frame ${frame?.routingId}, webContents ${wc?.id}`)
      if (frame && !this.activeFrames.some((f) => f.frame === frame)) {
        this.activeFrames.push({ frame, wc })
        this.log(LogLevel.DEBUG, `[IPC] Added frame, now ${this.activeFrames.length} active frames`)
      } else {
        this.log(LogLevel.DEBUG, '[IPC] Frame already active or invalid')
      }
    })

    ipcMain.on('capture:stop-stream', (event) => {
      const frame = event.senderFrame
      this.log(LogLevel.DEBUG, `[IPC] capture:stop-stream from frame ${frame?.routingId}`)
      if (frame) {
        const before = this.activeFrames.length
        this.activeFrames = this.activeFrames.filter((f) => f.frame !== frame)
        this.log(LogLevel.DEBUG, `[IPC] Removed frame, active frames: ${before} -> ${this.activeFrames.length}`)
      }
    })
  }

  // ------------------------------------------------------------------
  // Start / Stop z użyciem onFrame
  // ------------------------------------------------------------------
  private async startCapture(): Promise<void> {
    this.log(LogLevel.INFO, '[ScreenService] Starting screen capture...')
    if (!this.capturer) {
      this.log(LogLevel.INFO, '[ScreenService] Creating new ScreenCapture instance with logLevel debug')
      this.capturer = new ScreenCapture({
        // logLevel: 'debug',
        disableLogging: true
      })
    }

    // console.log('[ScreenService] Forcing backend to dxgi')
    // this.capturer.forceBackend('gdi')
    // this.capturer.forceBackend('dxgi')

    this.currentMonitorIndex = 0

    this.capturer.onMonitorChanged((monitor) => {
      this.log(LogLevel.INFO, `[ScreenService] Monitor changed to index: ${monitor.index}, setting inputService to match.`)
      inputService.monitorIndex = monitor.index
      inputService.controller.setCurrentMonitor(monitor.index)
    })

    // Uruchamiamy przechwytywanie i od razu rejestrujemy callback
    this.log(LogLevel.INFO, '[ScreenService] Calling capturer.start()')
    await this.capturer.start()

    this.monitorCount = await this.capturer.getMonitorCount()
    this.log(LogLevel.INFO, `[ScreenService] Detected ${this.monitorCount} monitor(s) available for capture`)

    // await new Promise((resolve) => setTimeout(resolve, 1000))
    this.log(LogLevel.INFO, '[ScreenService] Registering onFrame callback')
    this.capturer.onFrame(this.handleFrame)

    this.log(LogLevel.INFO, '[ScreenService] Capture started successfully')
  }

  public async nextMonitor(): Promise<void> {
    if (this.capturer) {
      this.log(LogLevel.INFO, '[ScreenService] Changing to next monitor, clearing old frames/textures...')
      this.releaseCachedSharedTexture()

      this.isProcessingFrame = false
      if (typeof this.capturer.nextMonitor === 'function') {
        await this.capturer.nextMonitor()
        if (this.monitorCount > 0) {
          this.log(LogLevel.INFO, `[ScreenService] ${this.monitorCount} monitors available, manually updating currentMonitorIndex [${this.currentMonitorIndex}]`)
          this.currentMonitorIndex = (this.currentMonitorIndex + 1) % this.monitorCount
          // Ręczny update na wypadek, gdyby event onMonitorChanged nie zadziałał na danym systemie (np. Linux backend)
          inputService.monitorIndex = this.currentMonitorIndex
          inputService.controller.setCurrentMonitor(this.currentMonitorIndex)
          this.log(LogLevel.INFO, `[ScreenService] nextMonitor manually synced inputService to index: ${this.currentMonitorIndex}`)
        }
      } else {
        this.log(LogLevel.WARN, '[ScreenService] capturer.nextMonitor is not available in the current screen-capture plugin version')
      }
    }
  }

  private stopCapture(): void {
    this.log(LogLevel.INFO, '[ScreenService] Stopping screen capture...')
    if (this.capturer) {
      this.log(LogLevel.INFO, '[ScreenService] Removing onFrame callback and stopping capturer')
      this.capturer.offFrame()
      this.capturer.offMonitorChanged()
      this.capturer.stop()
      this.capturer = null
    }

    this.releaseCachedSharedTexture()

    const framesCount = this.activeFrames.length
    this.activeFrames = []
    this.isProcessingFrame = false
    this.monitorCount = 0
    this.currentMonitorIndex = 0
    this.log(LogLevel.INFO, `[ScreenService] Capture stopped, cleared ${framesCount} active frames`)
  }

  private releaseCachedSharedTexture(): void {
    if (!this.cachedSharedTexture) return

    try {
      this.cachedSharedTexture.release()
      this.log(LogLevel.DEBUG, '[Capture] Released cached shared texture')
    } catch (e) {
      this.log(LogLevel.ERROR, '[Capture] Błąd przy release() cached shared texture:', e)
    } finally {
      this.cachedSharedTexture = null
      this.lastSharedTextureInfoSignature = null
    }
  }

  // ------------------------------------------------------------------
  // Callback wywoływany dla każdej nowej klatki
  // ------------------------------------------------------------------
  private handleFrame = (frame: FrameUpdate): void => {
    // DO NOT log the whole object, it contains pixelData which is huge and ruins performance
    // this.log(LogLevel.DEBUG, 'FrameUpdate received:', frame)
    const beforeFilter = this.activeFrames.length
    // Oczyszczamy listę aktywnych ramek
    this.activeFrames = this.activeFrames.filter(({ frame, wc }) => {
      const wcValid = wc && !wc.isDestroyed()
      const frameValid = frame && typeof frame.isDestroyed === 'function' && !frame.isDestroyed()
      const isValid = wcValid && frameValid && frame === wc.mainFrame
      if (!isValid) {
        this.log(LogLevel.DEBUG, '[Capture] Removing invalid frame (webContents destroyed or frame changed)')
      }
      return isValid
    })

    if (this.activeFrames.length !== beforeFilter) {
      this.log(LogLevel.DEBUG, `[Capture] Filtered active frames: ${beforeFilter} -> ${this.activeFrames.length}`)
    }

    if (this.activeFrames.length === 0) {
      this.log(LogLevel.DEBUG, '[Capture] No active frames, skipping frame processing')
      return
    }

    // --- Ścieżka GPU (shared texture) ---
    if (frame.sharedTextureInfo) {
      const info = frame.sharedTextureInfo
      const currentSignature = `${info.pixelFormat}-${info.codedSize.width}x${info.codedSize.height}-${Object.keys(info.handle ?? {}).join(',')}`

      if (currentSignature !== this.lastSharedTextureInfoSignature) {
        this.log(LogLevel.INFO, `[Capture] New shared texture signature: ${currentSignature}`)
        this.lastSharedTextureInfoSignature = currentSignature
        this.lastSharedTextureWarning = null
      }

      if (!info.handle) {
        this.releaseCachedSharedTexture()
        this.useCpuPath = true
        if (this.lastSharedTextureWarning !== 'noHandle') {
          this.log(LogLevel.WARN, '[Capture] Otrzymano info o sharedTexture, ale brak handle:', {
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
        this.log(LogLevel.INFO, '[Capture] Otrzymano info o sharedTexture:', {
          pixelFormat: info.pixelFormat,
          codedSize: info.codedSize,
          handleKeys: Object.keys(info.handle)
        })
        this.isHandleLogged = true
      }

      // console.debug('[Capture] Importing shared texture and sending to frames...')
      try {
        const isNewTexture =
          currentSignature !== this.lastSharedTextureInfoSignature || !this.cachedSharedTexture

        if (isNewTexture) {
          this.releaseCachedSharedTexture()
          this.cachedSharedTexture = sharedTexture.importSharedTexture({
            textureInfo: info as Electron.SharedTextureImportTextureInfo
          })
          this.lastSharedTextureInfoSignature = currentSignature
          this.log(LogLevel.DEBUG, '[Capture] Shared texture imported successfully')
        }

        if (!this.cachedSharedTexture) {
          this.log(LogLevel.WARN, '[Capture] Brak zaimportowanej sharedTexture, przechodzę do CPU fallback')
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
            this.log(LogLevel.WARN, '[Capture] Ignored frame (disposed?):', e)
            this.activeFrames = this.activeFrames.filter((f) => f.frame !== frame)
            return Promise.reject(e)
          }
        })

        // this.log(LogLevel.DEBUG, `[Capture] Sending shared texture to ${sends.length} frames`)
        void Promise.allSettled(sends).then((results) => {
          const allFailed = results.every((r) => r.status === 'rejected')
          if (allFailed) {
            const firstError = results.find((r) => r.status === 'rejected')
            this.log(LogLevel.ERROR, '[Capture] Błąd wysyłania sharedTexture do ramki:', firstError)
          } else {
            // const succeeded = results.filter((r) => r.status === 'fulfilled').length
            // this.log(LogLevel.DEBUG, `[Capture] Shared texture sent: ${succeeded} succeeded, ${results.length - succeeded} failed`)
          }
        })
      } catch (e) {
        this.log(LogLevel.ERROR, '[Capture] Główny błąd importSharedTexture:', e)
        this.releaseCachedSharedTexture()
      }

      return
    }

    // --- Fallback na CPU (surowe bajty) ---
    if (frame.pixelData) {
      this.releaseCachedSharedTexture()
      this.log(LogLevel.DEBUG, '[Capture] No shared texture info, using CPU path (pixelData)')
      this.useCpuPath = true
      this.sendCpuFrame(frame)
    } else {
      this.log(LogLevel.WARN, '[Capture] Frame has neither sharedTextureInfo nor pixelData')
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
      this.log(LogLevel.WARN, '[Capture] Invalid CPU frame data - skipping')
      return
    }

    this.log(LogLevel.DEBUG, `[Capture] Sending CPU frame ${width}x${height}, stride=${stride}, buffer size=${buffer.byteLength}, format=${format}`)

    if (this.isProcessingFrame) {
      this.log(LogLevel.DEBUG, '[Capture] CPU frame already processing, skipping duplicate send')
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
          this.log(LogLevel.WARN, '[Capture] Nie udało się wysłać surowej klatki:', e)
        }
      } else {
        this.log(LogLevel.DEBUG, '[Capture] Skipping destroyed webContents')
      }
    }

    this.log(LogLevel.DEBUG, `[Capture] CPU frame sent to ${sent} of ${this.activeFrames.length} active frames`)

    this.isProcessingFrame = false
  }
}

export const screenService = ScreenService.getInstance()
