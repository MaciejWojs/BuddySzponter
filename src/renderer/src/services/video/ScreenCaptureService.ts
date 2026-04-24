// src/renderer/services/video/ScreenCaptureService.ts
import { videoService } from '@renderer/services/video/videoService'

export class ScreenCaptureService {
  private stopFrameSubscription: (() => void) | null = null
  private sharedTextureStream: MediaStream | null = null

  public async startSharedTextureCapture(
    _captureFps: number,
    includeSystemAudio: boolean,
    systemAudioVolume: number,
    micTrack: MediaStreamTrack | null
  ): Promise<MediaStream | null> {
    try {
      const useCpuCapture =
        typeof window.screenCapture.shouldUseCpu === 'function'
          ? await window.screenCapture.shouldUseCpu()
          : false

      if (!useCpuCapture && typeof window.screenCapture.registerReceiver === 'function') {
        window.screenCapture.registerReceiver()
      }
      const win = window as unknown as {
        MediaStreamTrackGenerator?: new (init: { kind: 'video' }) => MediaStreamTrack & {
          writable: WritableStream<VideoFrame>
          contentHint: string
        }
      }

      if (!win.MediaStreamTrackGenerator) {
        return null
      }

      const generator = new win.MediaStreamTrackGenerator({ kind: 'video' })
      generator.contentHint = 'detail'
      const sharedTextureGeneratorWriter = generator.writable.getWriter()

      this.stopFrameSubscription?.()
      this.stopFrameSubscription = window.screenCapture.onFrameReceived((frameData) => {
        try {
          sharedTextureGeneratorWriter?.write(frameData.clone()).catch((writeError) => {
            console.error('[SessionStore] Błąd zapisu klatki do generatora:', writeError)
          })
        } catch (e) {
          console.error('[SessionStore] Błąd zapisu klatki do generatora:', e)
        } finally {
          if (frameData && typeof frameData.close === 'function') frameData.close()
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
      console.error('[SessionStore] Błąd sharedTexture:', e)
      return null
    }
  }

  public stop(): void {
    this.stopFrameSubscription?.()
    this.stopFrameSubscription = null

    if (window.screenCapture && typeof window.screenCapture.stopStream === 'function') {
      window.screenCapture.stopStream()
    }

    if (this.sharedTextureStream) {
      this.sharedTextureStream.getTracks().forEach((t) => t.stop())
      this.sharedTextureStream = null
    }
  }
}

export const screenCaptureService = new ScreenCaptureService()
