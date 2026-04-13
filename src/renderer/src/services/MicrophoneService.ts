import { getAudioContext, resumeAudioContext } from '@renderer/composables/useSharedAudioContext'

export interface AudioInputDeviceOption {
  deviceId: string
  label: string
}

class MicrophoneService {
  private currentStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private gainNode: GainNode | null = null
  private destinationNode: MediaStreamAudioDestinationNode | null = null
  private analyserNode: AnalyserNode | null = null

  private clearCurrentGraph(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect()
      } catch {
        console.warn('[MicrophoneService] Failed to disconnect source node')
      }
      this.sourceNode = null
    }

    if (this.gainNode) {
      try {
        this.gainNode.disconnect()
      } catch {
        console.warn('[MicrophoneService] Failed to disconnect gain node')
      }
      this.gainNode = null
    }

    if (this.analyserNode) {
      try {
        this.analyserNode.disconnect()
      } catch {
        console.warn('[MicrophoneService] Failed to disconnect analyser node')
      }
      this.analyserNode = null
    }

    if (this.destinationNode) {
      try {
        this.destinationNode.disconnect()
      } catch {
        console.warn('[MicrophoneService] Failed to disconnect destination node')
      }
      this.destinationNode = null
    }

    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop())
      this.currentStream = null
    }
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

  public async start(deviceId?: string, volume = 1): Promise<MediaStreamTrack | null> {
    try {
      const audioConstraints = {
        autoGainControl: true,
        noiseSuppression: true,
        echoCancellation: true,
        advanced: [{ googAutoGainControl: true }, { googNoiseSuppression: true }],
        ...(deviceId ? { deviceId: { exact: deviceId } } : {})
      } as unknown as MediaTrackConstraints

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      })

      const rawTrack = stream.getAudioTracks()[0]
      if (!rawTrack) {
        stream.getTracks().forEach((track) => track.stop())
        return null
      }

      if (!this.audioContext) {
        this.audioContext = getAudioContext()
      }
      void resumeAudioContext().catch(() => {})

      const nextSourceNode = this.audioContext.createMediaStreamSource(stream)
      const nextGainNode = this.audioContext.createGain()
      const nextAnalyserNode = this.audioContext.createAnalyser()
      const nextDestinationNode = this.audioContext.createMediaStreamDestination()

      nextGainNode.gain.value = Math.max(0, Math.min(2, volume))
      nextAnalyserNode.fftSize = 1024
      nextAnalyserNode.smoothingTimeConstant = 0.2

      nextSourceNode.connect(nextGainNode)
      nextGainNode.connect(nextAnalyserNode)
      nextGainNode.connect(nextDestinationNode)

      const processedTrack = nextDestinationNode.stream.getAudioTracks()[0] ?? null
      if (!processedTrack) {
        nextSourceNode.disconnect()
        nextGainNode.disconnect()
        nextAnalyserNode.disconnect()
        nextDestinationNode.disconnect()
        stream.getTracks().forEach((track) => track.stop())
        return null
      }

      processedTrack.contentHint = 'speech'

      this.clearCurrentGraph()

      this.currentStream = stream
      this.sourceNode = nextSourceNode
      this.gainNode = nextGainNode
      this.analyserNode = nextAnalyserNode
      this.destinationNode = nextDestinationNode

      return processedTrack
    } catch (error) {
      console.warn('[MicrophoneService] Nie udalo sie uruchomic mikrofonu:', error)
      return null
    }
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode
  }

  public setVolume(volume: number): void {
    if (!this.gainNode) return
    this.gainNode.gain.value = Math.max(0, Math.min(2, volume))
  }

  public stop(): void {
    this.clearCurrentGraph()
  }
}

export const microphoneService = new MicrophoneService()
