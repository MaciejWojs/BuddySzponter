// src/renderer/services/video/ScreenCaptureService.ts
import { videoService } from '@renderer/services/video/videoService'
import { useLogStore } from '@renderer/stores/devStores/logStore'

const logStore = useLogStore()

export class ScreenCaptureService {
  private stopFrameSubscription: (() => void) | null = null
  private hiddenCanvas: HTMLCanvasElement | null = null
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
        logStore.addLog('ERROR', 'Brak MediaStreamTrackGenerator w bieżącym środowisku.', 'api')
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
          logStore.addLog('ERROR', `Błąd zapisu klatki do generatora: ${e}`, 'api')
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
      logStore.addLog('ERROR', `Błąd sharedTexture: ${e}`, 'api')
      return null
    }
  }

  public stop(): void {
    this.stopFrameSubscription?.()
    this.stopFrameSubscription = null

    if (window.screenCapture) window.screenCapture.stopStream()

    if (this.sharedTextureStream) {
      this.sharedTextureStream.getTracks().forEach((t) => t.stop())
      this.sharedTextureStream = null
    }

    if (this.hiddenCanvas) {
      this.hiddenCanvas.width = 0
      this.hiddenCanvas.height = 0
      this.hiddenCanvas = null
    }
  }
}

export const screenCaptureService = new ScreenCaptureService()
