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

export interface AudioInputDeviceOption {
  deviceId: string
  label: string
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
  private localMicSourceNode: MediaStreamAudioSourceNode | null = null
  private localAudioDestinationNode: MediaStreamAudioDestinationNode | null = null
  private currentMicrophoneTrack: MediaStreamTrack | null = null

  public get isRunning(): boolean {
    return this.isCapturing
  }

  public async getAvailableMicrophones(): Promise<AudioInputDeviceOption[]> {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices
      .filter((device) => device.kind === 'audioinput' && !!device.deviceId)
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Mikrofon ${index + 1}`
      }))
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
      const audioConstraints = {
        autoGainControl: true,
        noiseSuppression: true,
        echoCancellation: true,
        advanced: [{ googAutoGainControl: true }, { googNoiseSuppression: true }],
        ...(deviceId ? { deviceId: { exact: deviceId } } : {})
      } as unknown as MediaTrackConstraints

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      })

      this.allStreamsToCleanUp.push(micStream)

      const rawAudioTrack = micStream.getAudioTracks()[0]
      if (rawAudioTrack) {
        const processedTrack = this.applyLocalMicrophoneProcessing(micStream, volume)
        processedTrack.contentHint = 'speech'
        this.activeStream!.addTrack(processedTrack)
        this.currentMicrophoneTrack = processedTrack
      }
    } catch (e) {
      console.warn('Nie udało się pobrać mikrofonu:', e)
    }
  }

  private resolveMicrophoneTrack(stream: MediaStream): MediaStreamTrack | null {
    const audioTracks = stream.getAudioTracks()
    const hintedMic = audioTracks.find((track) => track.contentHint === 'speech')
    const monoTrack = audioTracks.find((track) => track.getSettings().channelCount === 1)
    const firstNonSystem = audioTracks.find((track) => track.contentHint !== 'music')

    if (hintedMic) return hintedMic
    if (monoTrack) return monoTrack
    if (firstNonSystem) return firstNonSystem

    return null
  }

  public async switchMicrophone(
    deviceId: string | undefined,
    volume = 1
  ): Promise<MediaStream | null> {
    if (!this.activeStream) return null

    try {
      const audioConstraints = {
        autoGainControl: true,
        noiseSuppression: true,
        echoCancellation: true,
        advanced: [{ googAutoGainControl: true }, { googNoiseSuppression: true }],
        ...(deviceId ? { deviceId: { exact: deviceId } } : {})
      } as unknown as MediaTrackConstraints

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
      this.allStreamsToCleanUp.push(micStream)

      const rawAudioTrack = micStream.getAudioTracks()[0]
      if (!rawAudioTrack) {
        const previousMicTrack =
          this.currentMicrophoneTrack ?? this.resolveMicrophoneTrack(this.activeStream)
        if (previousMicTrack) {
          previousMicTrack.enabled = false
        }
        return null
      }

      const processedTrack = this.applyLocalMicrophoneProcessing(micStream, volume)
      processedTrack.contentHint = 'speech'

      const previousMicTrack =
        this.currentMicrophoneTrack ?? this.resolveMicrophoneTrack(this.activeStream)
      if (previousMicTrack) {
        this.activeStream.removeTrack(previousMicTrack)
        previousMicTrack.stop()
      }

      this.activeStream.addTrack(processedTrack)
      this.currentMicrophoneTrack = processedTrack
      return this.activeStream
    } catch (e) {
      console.warn('Nie udało się przełączyć mikrofonu:', e)

      const previousMicTrack =
        this.currentMicrophoneTrack ?? this.resolveMicrophoneTrack(this.activeStream)
      if (previousMicTrack) {
        previousMicTrack.enabled = false
      }

      return null
    }
  }

  private applyLocalMicrophoneProcessing(stream: MediaStream, volume: number): MediaStreamTrack {
    if (!this.audioContext) {
      this.audioContext = getAudioContext()
    }
    void resumeAudioContext().catch(() => {})

    if (this.localMicSourceNode) {
      try {
        this.localMicSourceNode.disconnect()
      } catch {
        console.warn('[VideoService] Failed to disconnect previous local mic source node')
      }
      this.localMicSourceNode = null
    }

    if (this.micVolumeNode) {
      try {
        this.micVolumeNode.disconnect()
      } catch {
        console.warn('[VideoService] Failed to disconnect previous local mic gain node')
      }
      this.micVolumeNode = null
    }

    if (this.localAudioDestinationNode) {
      try {
        this.localAudioDestinationNode.disconnect()
      } catch {
        console.warn('[VideoService] Failed to disconnect previous local mic destination node')
      }
      this.localAudioDestinationNode = null
    }

    const sourceNode = this.audioContext.createMediaStreamSource(stream)
    const localMicGain = this.audioContext.createGain()
    const localAudioDestination = this.audioContext.createMediaStreamDestination()

    localMicGain.gain.value = Math.max(0, Math.min(2, volume))

    sourceNode.connect(localMicGain)
    localMicGain.connect(localAudioDestination)

    this.localMicSourceNode = sourceNode
    this.micVolumeNode = localMicGain
    this.localAudioDestinationNode = localAudioDestination

    return localAudioDestination.stream.getAudioTracks()[0]
  }

  // --- ZARZĄDZANIE GŁOŚNOŚCIĄ (Web Audio API) ---

  private applyVolumeToTrack(
    stream: MediaStream,
    volume: number,
    type: 'system' | 'microphone'
  ): MediaStreamTrack {
    if (!this.audioContext) {
      this.audioContext = getAudioContext()
    }
    void resumeAudioContext().catch(() => {})

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
    this.setLocalMicrophoneVolume(volume)
  }

  public setLocalMicrophoneVolume(volume: number): void {
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
    this.currentMicrophoneTrack = null

    this.allStreamsToCleanUp.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop())
    })
    this.allStreamsToCleanUp = []

    if (this.localMicSourceNode) {
      try {
        this.localMicSourceNode.disconnect()
      } catch {
        console.warn('[VideoService] Failed to disconnect local mic source node')
      }
      this.localMicSourceNode = null
    }

    if (this.micVolumeNode) {
      try {
        this.micVolumeNode.disconnect()
      } catch {
        console.warn('[VideoService] Failed to disconnect local mic gain node')
      }
      this.micVolumeNode = null
    }

    if (this.localAudioDestinationNode) {
      try {
        this.localAudioDestinationNode.disconnect()
      } catch {
        console.warn('[VideoService] Failed to disconnect local mic destination node')
      }
      this.localAudioDestinationNode = null
    }

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
