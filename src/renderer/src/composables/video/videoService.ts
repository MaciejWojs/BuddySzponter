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

export interface VideoCaptureOptions {
  includeScreen?: boolean
  includeSystemAudio?: boolean
  includeMicrophone?: boolean
  microphoneDeviceId?: string
  systemAudioVolume?: number
  microphoneVolume?: number
}

class VideoService {
  private isCapturing = false
  private trackWriter: WritableStreamDefaultWriter<VideoFrame> | null = null
  private activeStream: MediaStream | null = null
  private stopStream: (() => void) | null = null
  private auxiliaryStreams: MediaStream[] = []
  private audioContext: AudioContext | null = null
  private systemGainNode: GainNode | null = null
  private microphoneGainNode: GainNode | null = null
  private systemAudioVolume = 1
  private microphoneVolume = 1

  public get isRunning(): boolean {
    return this.isCapturing
  }

  public async start(options: VideoCaptureOptions = {}): Promise<MediaStream> {
    if (this.isCapturing && this.activeStream) {
      return this.activeStream
    }

    const includeScreen = options.includeScreen ?? true

    this.activeStream = new MediaStream()
    this.isCapturing = true

    if (includeScreen) {
      const win = window as unknown as WindowWithCapture

      if (!win.capture) {
        throw new Error('Brak wstrzykniętego obiektu window.capture (addon C++)!')
      }

      const Generator = win.MediaStreamTrackGenerator
      if (!Generator) {
        throw new Error('Twoja wersja Electrona nie obsługuje MediaStreamTrackGenerator')
      }

      const generator = new Generator({ kind: 'video' })
      // Tekst i UI wymagają wyższej ostrości niż domyślny hint dla ruchu.
      generator.contentHint = 'detail'

      this.trackWriter = generator.writable.getWriter()
      this.activeStream.addTrack(generator)

      await win.capture.start()

      this.stopStream = win.capture.subscribeStream((frame: VideoFrame) => {
        if (this.isCapturing && this.trackWriter) {
          this.trackWriter.write(frame.clone()).catch(() => {})
        }
        frame.close()
      })
    }

    const includeSystemAudio = options.includeSystemAudio ?? true
    const includeMicrophone = options.includeMicrophone ?? true

    this.systemAudioVolume = this.normalizeVolume(
      options.systemAudioVolume ?? this.systemAudioVolume
    )
    this.microphoneVolume = this.normalizeVolume(options.microphoneVolume ?? this.microphoneVolume)

    if (includeSystemAudio) {
      await this.attachSystemAudioTrack(this.activeStream)
    }

    if (includeMicrophone) {
      await this.attachMicrophoneTrack(this.activeStream, options.microphoneDeviceId)
    }

    return this.activeStream
  }

  public setSystemAudioVolume(volume: number): void {
    this.systemAudioVolume = this.normalizeVolume(volume)
    if (this.systemGainNode) {
      this.systemGainNode.gain.value = this.systemAudioVolume
    }
  }

  public setMicrophoneVolume(volume: number): void {
    this.microphoneVolume = this.normalizeVolume(volume)
    if (this.microphoneGainNode) {
      this.microphoneGainNode.gain.value = this.microphoneVolume
    }
  }

  private normalizeVolume(volume: number): number {
    if (!Number.isFinite(volume)) return 1
    return Math.max(0, Math.min(2, volume))
  }

  private getOrCreateAudioContext(): AudioContext | null {
    if (this.audioContext) return this.audioContext

    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null

    this.audioContext = new Ctx()
    return this.audioContext
  }

  private buildProcessedAudioTrack(
    sourceStream: MediaStream,
    target: 'system' | 'microphone'
  ): MediaStreamTrack | null {
    const context = this.getOrCreateAudioContext()
    if (!context) {
      return sourceStream.getAudioTracks()[0] ?? null
    }

    const sourceNode = context.createMediaStreamSource(sourceStream)
    const gainNode = context.createGain()
    const destination = context.createMediaStreamDestination()

    gainNode.gain.value = target === 'system' ? this.systemAudioVolume : this.microphoneVolume

    sourceNode.connect(gainNode)
    gainNode.connect(destination)

    const processedTrack = destination.stream.getAudioTracks()[0]
    if (!processedTrack) {
      sourceNode.disconnect()
      gainNode.disconnect()
      return null
    }

    if (target === 'system') {
      this.systemGainNode = gainNode
    } else {
      this.microphoneGainNode = gainNode
    }

    return processedTrack
  }

  private async attachSystemAudioTrack(targetStream: MediaStream): Promise<void> {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      console.warn('[VideoService] getDisplayMedia nie jest dostępne - pomijam audio systemowe.')
      return
    }

    try {
      const systemCapture = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      })

      systemCapture.getVideoTracks().forEach((track) => track.stop())

      const sourceAudioTrack = systemCapture.getAudioTracks()[0]
      if (!sourceAudioTrack) {
        systemCapture.getTracks().forEach((track) => track.stop())
        return
      }

      const systemAudioTrack = this.buildProcessedAudioTrack(systemCapture, 'system')
      if (!systemAudioTrack) {
        systemCapture.getTracks().forEach((track) => track.stop())
        return
      }

      systemAudioTrack.contentHint = 'music'

      targetStream.addTrack(systemAudioTrack)
      this.auxiliaryStreams.push(systemCapture)
    } catch (e) {
      console.error('[VideoService] Nie udało się podpiąć audio systemowego:', e)
    }
  }

  private async attachMicrophoneTrack(
    targetStream: MediaStream,
    microphoneDeviceId?: string
  ): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('[VideoService] getUserMedia nie jest dostępne - pomijam mikrofon.')
      return
    }

    try {
      const microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(microphoneDeviceId ? { deviceId: { exact: microphoneDeviceId } } : {})
        }
      })

      const sourceAudioTrack = microphoneStream.getAudioTracks()[0]
      if (!sourceAudioTrack) {
        microphoneStream.getTracks().forEach((track) => track.stop())
        return
      }

      const microphoneTrack = this.buildProcessedAudioTrack(microphoneStream, 'microphone')
      if (!microphoneTrack) {
        microphoneStream.getTracks().forEach((track) => track.stop())
        return
      }

      microphoneTrack.contentHint = 'speech'

      targetStream.addTrack(microphoneTrack)
      this.auxiliaryStreams.push(microphoneStream)
    } catch (e) {
      console.error('[VideoService] Nie udało się podpiąć mikrofonu:', e)
    }
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

    if (this.auxiliaryStreams.length > 0) {
      this.auxiliaryStreams.forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop())
      })
      this.auxiliaryStreams = []
    }

    this.systemGainNode = null
    this.microphoneGainNode = null

    if (this.audioContext) {
      this.audioContext.close().catch(() => {})
      this.audioContext = null
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
