// src/renderer/services/VideoService.ts

interface MediaStreamTrackGeneratorInit {
  kind: 'video' | 'audio'
}

interface MediaStreamTrackGenerator extends MediaStreamTrack {
  writable: WritableStream<VideoFrame>
}

interface WindowWithCapture extends Window {
  MediaStreamTrackGenerator: {
    new (init: MediaStreamTrackGeneratorInit): MediaStreamTrackGenerator
  }
  capture: {
    start: () => Promise<void>
    stop: () => Promise<void>
    subscribeStream: (onFrame: (frame: VideoFrame) => void) => () => void
  }
}

class VideoService {
  private isCapturing = false
  private trackWriter: WritableStreamDefaultWriter<VideoFrame> | null = null
  private activeStream: MediaStream | null = null
  private stopStream: (() => void) | null = null

  public get isRunning(): boolean {
    return this.isCapturing
  }

  public async start(): Promise<MediaStream> {
    if (this.isCapturing && this.activeStream) {
      return this.activeStream
    }

    const win = window as unknown as WindowWithCapture

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

    await win.capture.start()
    this.isCapturing = true

    this.stopStream = win.capture.subscribeStream((frame: VideoFrame) => {
      if (this.isCapturing && this.trackWriter) {
         this.trackWriter.write(frame.clone()).catch(() => {})
      }
      frame.close()
    })

    return this.activeStream
  }

  public async stop(): Promise<void> {
    if (!this.isCapturing) return
    this.isCapturing = false

    if (this.stopStream) {
      this.stopStream()
      this.stopStream = null
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
      const win = window as unknown as WindowWithCapture
      if (win.capture) await win.capture.stop()
    } catch (e) {
      console.error('[VideoService] Błąd podczas zatrzymywania addona:', e)
    }
  }
}

export const videoService = new VideoService()
