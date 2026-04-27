// src/renderer/services/video/ScreenCaptureService.ts
import { videoService } from '@renderer/services/video/videoService'

export class ScreenCaptureService {
  private stopFrameSubscription: (() => void) | null = null
  private sharedTextureStream: MediaStream | null = null

  private writer: WritableStreamDefaultWriter<VideoFrame> | null = null
  private track: MediaStreamTrack | null = null

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

      let lastFrameTime = 0
      const frameInterval = 1000 / Math.max(1, captureFps || 60)

      this.stopFrameSubscription?.()
      this.stopFrameSubscription = window.screenCapture.onFrameReceived(async (frameData) => {
        try {
          if (!this.writer) {
            frameData.close()
            return
          }

          const now = performance.now()
          if (now - lastFrameTime < frameInterval) {
            frameData.close()
            return
          }

          if (this.writer.desiredSize !== null && this.writer.desiredSize <= 0) {
            frameData.close()
            return
          }

          lastFrameTime = now

          await this.writer.write(frameData)
          frameData.close()
        } catch (writeError) {
          console.error('[ScreenCaptureService] Błąd zapisu klatki:', writeError)
          try {
            frameData.close()
          } catch {
            // ignore
          }
        }
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
}

export const screenCaptureService = new ScreenCaptureService()
