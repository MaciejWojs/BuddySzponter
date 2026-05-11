// src/renderer/services/video/videoService.ts
import { getAudioContext, resumeAudioContext } from '@renderer/composables/useSharedAudioContext'

export interface VideoCaptureOptions {
  includeSystemAudio?: boolean
  externalMicTrack?: MediaStreamTrack
  systemAudioVolume?: number
}

class VideoService {
  private isCapturing = false
  private activeStream: MediaStream | null = null
  private allStreamsToCleanUp: MediaStream[] = []

  private audioContext: AudioContext | null = null
  private systemVolumeNode: GainNode | null = null

  public get isRunning(): boolean {
    return this.isCapturing
  }

  public async startWithExternalVideoTrack(
    externalVideoTrack: MediaStreamTrack,
    options: VideoCaptureOptions = {}
  ): Promise<MediaStream> {
    if (this.isCapturing) {
      await this.stop()
    }

    this.isCapturing = true
    this.activeStream = new MediaStream()

    externalVideoTrack.contentHint = 'detail'
    this.activeStream.addTrack(externalVideoTrack)

    /** Mikrofon przed dźwiękiem systemu — stabilna kolejność ścieżek i bezpieczniejsze fallbacki w WebRTC. */
    if (options.externalMicTrack) {
      this.activeStream.addTrack(options.externalMicTrack)
    }

    const wantsSystemAudio = options.includeSystemAudio ?? true
    if (wantsSystemAudio) {
      const vol = options.systemAudioVolume ?? 1
      await this.addSystemAudioTrack(vol)
    }

    return this.activeStream
  }
  private async addSystemAudioTrack(volume: number): Promise<void> {
    try {
      let systemStream: MediaStream
      try {
        systemStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            suppressLocalAudioPlayback: true
          } as MediaTrackConstraints
        })
      } catch {
        systemStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        })
      }

      this.allStreamsToCleanUp.push(systemStream)

      systemStream.getVideoTracks().forEach((track) => track.stop())

      const rawAudioTrack = systemStream.getAudioTracks()[0]
      if (rawAudioTrack) {
        const processedTrack = this.applyVolumeToTrack(systemStream, volume)
        processedTrack.contentHint = 'music'
        this.activeStream!.addTrack(processedTrack)
      }
    } catch (e) {
      console.warn('[VideoService] Nie udało się pobrać dźwięku systemu:', e)
    }
  }

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

  public async stop(): Promise<void> {
    if (!this.isCapturing) return
    this.isCapturing = false

    if (this.activeStream) {
      this.activeStream.getTracks().forEach((track) => track.stop())
      this.activeStream = null
    }

    this.allStreamsToCleanUp.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop())
    })
    this.allStreamsToCleanUp = []

    this.systemVolumeNode = null
    this.audioContext = null
  }
}

export const videoService = new VideoService()
