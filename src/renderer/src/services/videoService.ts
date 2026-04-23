// src/renderer/services/VideoService.ts
import { getAudioContext, resumeAudioContext } from '@renderer/composables/useSharedAudioContext'

interface WindowWithCapture extends Window {
  MediaStreamTrackGenerator: {
    new (init: { kind: 'video' | 'audio' }): MediaStreamTrack & {
      writable: WritableStream<VideoFrame>
      contentHint: string
    }
  }
  capture: {
    start: () => Promise<void>
    stop: () => Promise<void>
    getFps: () => Promise<number>
    subscribeStream: (onFrame: (frame: VideoFrame) => void) => () => void
  }
}

export interface VideoCaptureOptions {
  includeScreen?: boolean
  includeSystemAudio?: boolean
  externalMicTrack?: MediaStreamTrack
  systemAudioVolume?: number
}

class VideoService {
  private isCapturing = false
  private activeStream: MediaStream | null = null
  private allStreamsToCleanUp: MediaStream[] = []

  // Elementy do przechwytywania wideo z C++
  private trackWriter: WritableStreamDefaultWriter<VideoFrame> | null = null
  private stopNativeCapture: (() => void) | null = null

  // Elementy do sterowania dźwiękiem (Web Audio API)
  private audioContext: AudioContext | null = null
  private systemVolumeNode: GainNode | null = null

  public get isRunning(): boolean {
    return this.isCapturing
  }

  public async start(options: VideoCaptureOptions = {}): Promise<MediaStream> {
    if (this.isCapturing && this.activeStream) {
      return this.activeStream
    }

    this.isCapturing = true
    this.activeStream = new MediaStream()

    const wantsScreen = options.includeScreen ?? true
    if (wantsScreen) {
      await this.addScreenVideoTrack()
    }

    const wantsSystemAudio = options.includeSystemAudio ?? true
    if (wantsSystemAudio) {
      const vol = options.systemAudioVolume ?? 1
      await this.addSystemAudioTrack(vol)
    }

    if (options.externalMicTrack) {
      this.activeStream.addTrack(options.externalMicTrack)
    }

    return this.activeStream
  }

  public async startWithExternalVideoTrack(
    externalVideoTrack: MediaStreamTrack,
    options: Omit<VideoCaptureOptions, 'includeScreen'> = {}
  ): Promise<MediaStream> {
    if (this.isCapturing) {
      await this.stop()
    }

    this.isCapturing = true
    this.activeStream = new MediaStream()

    const clonedVideoTrack = externalVideoTrack.clone()
    clonedVideoTrack.contentHint = 'detail'
    this.activeStream.addTrack(clonedVideoTrack)

    const wantsSystemAudio = options.includeSystemAudio ?? true
    if (wantsSystemAudio) {
      const vol = options.systemAudioVolume ?? 1
      await this.addSystemAudioTrack(vol)
    }

    if (options.externalMicTrack) {
      this.activeStream.addTrack(options.externalMicTrack)
    }

    return this.activeStream
  }

  private async addScreenVideoTrack(): Promise<void> {
    const win = window as unknown as WindowWithCapture

    const generator = new win.MediaStreamTrackGenerator({ kind: 'video' })
    generator.contentHint = 'detail'

    this.trackWriter = generator.writable.getWriter()

    this.activeStream!.addTrack(generator)

    await win.capture.start()
    this.stopNativeCapture = win.capture.subscribeStream((frame: VideoFrame) => {
      try {
        if (this.isCapturing && this.trackWriter) {
          const shouldDropFrame =
            this.trackWriter.desiredSize !== null && this.trackWriter.desiredSize <= 0

          if (!shouldDropFrame) {
            const cloned = frame.clone()
            this.trackWriter.write(cloned).catch(() => {
              cloned.close()
            })
          }
        }
      } catch (error) {
        console.error('Błąd zapisu klatki native capture:', error)
      } finally {
        frame.close()
      }
    })
  }

  private async addSystemAudioTrack(volume: number): Promise<void> {
    try {
      const systemStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      })

      this.allStreamsToCleanUp.push(systemStream)

      systemStream.getVideoTracks().forEach((track) => track.stop())

      const rawAudioTrack = systemStream.getAudioTracks()[0]
      if (rawAudioTrack) {
        const processedTrack = this.applyVolumeToTrack(systemStream, volume)
        processedTrack.contentHint = 'music'
        this.activeStream!.addTrack(processedTrack)
      }
    } catch (e) {
      console.warn('Nie udało się pobrać dźwięku systemu:', e)
    }
  }

  // --- ZARZĄDZANIE GŁOŚNOŚCIĄ (Web Audio API) ---

  private applyVolumeToTrack(stream: MediaStream, volume: number): MediaStreamTrack {
    if (!this.audioContext) {
      this.audioContext = getAudioContext()
    }
    void resumeAudioContext().catch(() => {})

    const sourceNode = this.audioContext.createMediaStreamSource(stream)
    const gainNode = this.audioContext.createGain()
    const destinationNode = this.audioContext.createMediaStreamDestination()

    gainNode.gain.value = Math.max(0, Math.min(2, volume))

    this.systemVolumeNode = gainNode

    sourceNode.connect(gainNode)
    gainNode.connect(destinationNode)

    return destinationNode.stream.getAudioTracks()[0]
  }

  public setSystemAudioVolume(volume: number): void {
    if (this.systemVolumeNode) {
      this.systemVolumeNode.gain.value = Math.max(0, Math.min(2, volume))
    }
  }

  // --- ZATRZYMYWANIE I CZYSZCZENIE PAMIĘCI ---
  public async stop(): Promise<void> {
    if (!this.isCapturing) return
    this.isCapturing = false

    if (this.stopNativeCapture) {
      this.stopNativeCapture()
      this.stopNativeCapture = null
    }

    const win = window as unknown as WindowWithCapture
    if (win && win.capture) {
      win.capture.stop().catch(() => {})
    }

    if (this.trackWriter) {
      this.trackWriter.close().catch(() => {})
      this.trackWriter = null
    }

    if (this.activeStream) {
      this.activeStream.getTracks().forEach((track) => {
        const isVideoTrack = track.kind === 'video'
        const isSystemAudioTrack = track.kind === 'audio' && track.contentHint === 'music'
        if (isVideoTrack || isSystemAudioTrack) {
          track.stop()
        }
      })
      this.activeStream = null
    }

    this.allStreamsToCleanUp.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop())
    })
    this.allStreamsToCleanUp = []

    this.systemVolumeNode = null
    this.audioContext = null

    try {
      const win = window as unknown as WindowWithCapture
      if (win.capture) await win.capture.stop()
    } catch (e) {
      console.error('Błąd zatrzymywania addona:', e)
    }
  }
}

export const videoService = new VideoService()
