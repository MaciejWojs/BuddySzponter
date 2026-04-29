// src/renderer/services/video/ScreenCaptureService.ts
import { videoService } from '@renderer/services/video/videoService'

export class ScreenCaptureService {
  private stopFrameSubscription: (() => void) | null = null
  private sharedTextureStream: MediaStream | null = null

  private writer: WritableStreamDefaultWriter<VideoFrame> | null = null
  private track: MediaStreamTrack | null = null
  private pendingFrame: VideoFrame | null = null
  private isWritingFrame = false
  private backpressureRetryTimer: number | null = null
  private lastFrameTime = 0
  private frameInterval = 0

  public async startSharedTextureCapture(
    captureFps: number,
    includeSystemAudio: boolean,
    systemAudioVolume: number,
    micTrack: MediaStreamTrack | null
  ): Promise<MediaStream | null> {
    try {
      if (typeof window.screenCapture.registerReceiver === 'function') {
        window.screenCapture.registerReceiver()
      }

      const win = window as unknown as {
        MediaStreamTrackGenerator?: new (init: { kind: 'video' }) => MediaStreamTrack & {
          writable: WritableStream<VideoFrame>
          contentHint: string
        }
      }

      if (!win.MediaStreamTrackGenerator) {
        console.error('[ScreenCaptureService] Brak wsparcia dla MediaStreamTrackGenerator.')
        return null
      }

      const generator = new win.MediaStreamTrackGenerator({ kind: 'video' })
      generator.contentHint = 'detail'

      this.writer = generator.writable.getWriter()
      this.track = generator
      this.lastFrameTime = 0
      this.frameInterval = 1000 / Math.max(1, captureFps || 60)

      this.stopFrameSubscription?.()
      this.stopFrameSubscription = window.screenCapture.onFrameReceived((frameData) => {
        this.handleIncomingFrame(frameData)
      })

      this.sharedTextureStream = await videoService.startWithExternalVideoTrack(generator, {
        includeSystemAudio: includeSystemAudio,
        externalMicTrack: micTrack ?? undefined,
        systemAudioVolume: systemAudioVolume
      })

      const videoTrack = this.sharedTextureStream.getVideoTracks()[0]
      if (videoTrack) videoTrack.enabled = true

      window.screenCapture.requestStream()
      return this.sharedTextureStream
    } catch (e) {
      console.error('[ScreenCaptureService] Błąd inicjalizacji capture:', e)
      return null
    }
  }

  public stop(): void {
    this.stopFrameSubscription?.()
    this.stopFrameSubscription = null

    if (window.screenCapture && typeof window.screenCapture.stopStream === 'function') {
      window.screenCapture.stopStream()
    }

    if (this.backpressureRetryTimer !== null) {
      clearTimeout(this.backpressureRetryTimer)
      this.backpressureRetryTimer = null
    }

    if (this.pendingFrame) {
      try {
        this.pendingFrame.close()
      } catch {
        // ignore
      }
      this.pendingFrame = null
    }

    this.isWritingFrame = false

    if (this.writer) {
      this.writer.close().catch(() => {})
      this.writer = null
    }

    if (this.track) {
      this.track.stop()
      this.track = null
    }

    if (this.sharedTextureStream) {
      this.sharedTextureStream.getTracks().forEach((t) => t.stop())
      this.sharedTextureStream = null
    }
  }

  private normalizeFrameTimestamp(frameData: VideoFrame): VideoFrame {
    if (typeof frameData.timestamp === 'number' && frameData.timestamp > 0) {
      return frameData
    }

    try {
      const normalizedFrame = new VideoFrame(frameData, {
        timestamp: performance.now() * 1000
      })
      frameData.close()
      return normalizedFrame
    } catch {
      return frameData
    }
  }

  private handleIncomingFrame(frameData: VideoFrame): void {
    try {
      if (!this.writer) {
        frameData.close()
        return
      }

      const now = performance.now()
      if (now - this.lastFrameTime < this.frameInterval - 2) {
        frameData.close()
        return
      }

      this.lastFrameTime = now
      frameData = this.normalizeFrameTimestamp(frameData)

      if (this.pendingFrame) {
        this.pendingFrame.close()
      }
      this.pendingFrame = frameData

      if (!this.isWritingFrame) {
        void this.flushPendingFrame()
      }
    } catch (e) {
      console.error('[ScreenCaptureService] Błąd w pętli renderowania:', e)
      try {
        frameData.close()
      } catch {
        // ignore
      }
    }
  }

  private async flushPendingFrame(): Promise<void> {
    if (!this.writer || this.isWritingFrame) return
    if (!this.pendingFrame) return

    const frameToWrite = this.pendingFrame
    this.pendingFrame = null
    this.isWritingFrame = true

    try {
      if (this.writer.desiredSize !== null && this.writer.desiredSize <= 0) {
        this.pendingFrame = frameToWrite
        if (this.backpressureRetryTimer === null) {
          this.backpressureRetryTimer = window.setTimeout(() => {
            this.backpressureRetryTimer = null
            void this.flushPendingFrame()
          }, 16)
        }
        return
      }

      await this.writer.write(frameToWrite)
    } catch (writeError) {
      console.error('[ScreenCaptureService] Błąd zapisu klatki:', writeError)
    } finally {
      try {
        frameToWrite.close()
      } catch {
        // ignore
      }
      this.isWritingFrame = false
      if (this.pendingFrame) {
        void this.flushPendingFrame()
      }
    }
  }
}

export const screenCaptureService = new ScreenCaptureService()
