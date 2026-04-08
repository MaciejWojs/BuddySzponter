// src/renderer/services/VideoService.ts

interface MediaStreamTrackGeneratorInit {
  kind: 'video' | 'audio'
}

interface MediaStreamTrackGenerator extends MediaStreamTrack {
  writable: WritableStream<VideoFrame>
}

interface WindowWithGenerator extends Window {
  MediaStreamTrackGenerator: {
    new (init: MediaStreamTrackGeneratorInit): MediaStreamTrackGenerator
  }
  capture: {
    start: () => void
    stop: () => void
    getFrame: () => { frame: VideoFrame; release: () => void } | null
  }
}

class VideoService {
  private isCapturing = false
  private trackWriter: WritableStreamDefaultWriter<VideoFrame> | null = null
  private loopTimeoutId: number | null = null
  private activeStream: MediaStream | null = null

  private readonly TARGET_FPS = 60
  private readonly FRAME_INTERVAL = 1000 / this.TARGET_FPS

  public get isRunning(): boolean {
    return this.isCapturing
  }

  public start(): MediaStream {
    if (this.isCapturing && this.activeStream) {
      return this.activeStream
    }

    const win = window as unknown as WindowWithGenerator

    if (!win.capture) {
      throw new Error('Brak wstrzykniętego obiektu window.capture (addon C++)!')
    }

    const Generator = win.MediaStreamTrackGenerator
    if (!Generator) {
      throw new Error('Twoja wersja Electrona nie obsługuje MediaStreamTrackGenerator')
    }

    const generator = new Generator({ kind: 'video' })
    this.trackWriter = generator.writable.getWriter()
    this.activeStream = new MediaStream([generator])

    win.capture.start()
    this.isCapturing = true

    this.renderLoop()

    return this.activeStream
  }

  public stop(): void {
    if (!this.isCapturing) return
    this.isCapturing = false

    if (this.loopTimeoutId !== null) {
      window.clearTimeout(this.loopTimeoutId)
      this.loopTimeoutId = null
    }

    if (this.trackWriter) {
      this.trackWriter.close().catch(() => {})
      this.trackWriter = null
    }

    if (this.activeStream) {
      this.activeStream.getTracks().forEach((track) => track.stop())
      this.activeStream = null
    }

    try {
      const win = window as unknown as WindowWithGenerator
      if (win.capture) win.capture.stop()
    } catch (e) {
      console.error('[VideoService] Błąd podczas zatrzymywania addona:', e)
    }
  }

  private renderLoop = (): void => {
    if (!this.isCapturing) return

    const timestamp = performance.now()
    const win = window as unknown as WindowWithGenerator

    try {
      const data = win.capture.getFrame()

      if (data && data.frame) {
        if (this.trackWriter) {
          this.trackWriter.write(data.frame.clone()).catch(() => {})
        }
        data.frame.close()
        data.release()
      }
    } catch (error) {
      console.error('[VideoService] Błąd cyklu renderowania:', error)
    }

    const elapsed = performance.now() - timestamp
    const nextDelay = Math.max(0, this.FRAME_INTERVAL - elapsed)

    this.loopTimeoutId = window.setTimeout(this.renderLoop, nextDelay)
  }
}

export const videoService = new VideoService()
