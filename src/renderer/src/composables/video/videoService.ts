// src/renderer/services/VideoService.ts

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

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
    getFps(): Promise<number | null>
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
  private activeStream: MediaStream | null = null
  private allStreamsToCleanUp: MediaStream[] = []

  // Elementy do przechwytywania wideo z C++
  private trackWriter: WritableStreamDefaultWriter<VideoFrame> | null = null
  private stopNativeCapture: (() => void) | null = null

  // Elementy do sterowania dźwiękiem (Web Audio API)
  private audioContext: AudioContext | null = null
  private systemVolumeNode: GainNode | null = null
  private micVolumeNode: GainNode | null = null

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

    const wantsMic = options.includeMicrophone ?? true
    if (wantsMic) {
      const vol = options.microphoneVolume ?? 1
      await this.addMicrophoneTrack(options.microphoneDeviceId, vol)
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

    const wantsMic = options.includeMicrophone ?? true
    if (wantsMic) {
      const vol = options.microphoneVolume ?? 1
      await this.addMicrophoneTrack(options.microphoneDeviceId, vol)
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
      if (this.isCapturing && this.trackWriter) {
        this.trackWriter.write(frame.clone()).catch(() => {})
      }
      frame.close()
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
        const processedTrack = this.applyVolumeToTrack(systemStream, volume, 'system')
        processedTrack.contentHint = 'music'
        this.activeStream!.addTrack(processedTrack)
      }
    } catch (e) {
      console.warn('Nie udało się pobrać dźwięku systemu:', e)
    }
  }

  private async addMicrophoneTrack(deviceId: string | undefined, volume: number): Promise<void> {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          ...(deviceId ? { deviceId: { exact: deviceId } } : {})
        }
      })

      this.allStreamsToCleanUp.push(micStream)

      const rawAudioTrack = micStream.getAudioTracks()[0]
      if (rawAudioTrack) {
        const processedTrack = this.applyVolumeToTrack(micStream, volume, 'microphone')
        processedTrack.contentHint = 'speech'
        this.activeStream!.addTrack(processedTrack)
      }
    } catch (e) {
      console.warn('Nie udało się pobrać mikrofonu:', e)
    }
  }

  // --- ZARZĄDZANIE GŁOŚNOŚCIĄ (Web Audio API) ---

  private applyVolumeToTrack(
    stream: MediaStream,
    volume: number,
    type: 'system' | 'microphone'
  ): MediaStreamTrack {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      this.audioContext = new AudioCtx!()
    }

    const sourceNode = this.audioContext.createMediaStreamSource(stream)
    const gainNode = this.audioContext.createGain()
    const destinationNode = this.audioContext.createMediaStreamDestination()

    gainNode.gain.value = Math.max(0, Math.min(2, volume))

    if (type === 'system') {
      this.systemVolumeNode = gainNode
    } else {
      this.micVolumeNode = gainNode
    }

    sourceNode.connect(gainNode)
    gainNode.connect(destinationNode)

    return destinationNode.stream.getAudioTracks()[0]
  }

  public setSystemAudioVolume(volume: number): void {
    if (this.systemVolumeNode) {
      this.systemVolumeNode.gain.value = Math.max(0, Math.min(2, volume))
    }
  }

  public setMicrophoneVolume(volume: number): void {
    if (this.micVolumeNode) {
      this.micVolumeNode.gain.value = Math.max(0, Math.min(2, volume))
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
      this.activeStream.getTracks().forEach((track) => track.stop())
      this.activeStream = null
    }

    this.allStreamsToCleanUp.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop())
    })
    this.allStreamsToCleanUp = []

    this.systemVolumeNode = null
    this.micVolumeNode = null
    if (this.audioContext) {
      this.audioContext.close().catch(() => {})
      this.audioContext = null
    }

    try {
      const win = window as unknown as WindowWithCapture
      if (win.capture) await win.capture.stop()
    } catch (e) {
      console.error('Błąd zatrzymywania addona:', e)
    }
  }
}

export const videoService = new VideoService()
