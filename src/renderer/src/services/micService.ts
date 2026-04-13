import { getAudioContext, resumeAudioContext } from '@renderer/composables/useSharedAudioContext'

export interface AudioInputDeviceOption {
  deviceId: string
  label: string
}

class MicrophoneService {
  private currentStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private inputGateNode: GainNode | null = null
  private inputLevelAnalyserNode: AnalyserNode | null = null
  private highPassEQNode: BiquadFilterNode | null = null
  private lowShelfEQNode: BiquadFilterNode | null = null
  private limiterNode: DynamicsCompressorNode | null = null
  private gainNode: GainNode | null = null
  private destinationNode: MediaStreamAudioDestinationNode | null = null
  private analyserNode: AnalyserNode | null = null
  private limiterEnabled = true
  private inputThreshold = 0.008
  private localMonitoringEnabled = false
  private monitorElement: HTMLAudioElement | null = null
  private gateRafId: number | null = null
  private gateData: Float32Array<ArrayBuffer> | null = null

  private syncMonitoringOutput(): void {
    if (!this.localMonitoringEnabled) {
      if (this.monitorElement) {
        this.monitorElement.pause()
        this.monitorElement.srcObject = null
      }
      return
    }

    if (!this.destinationNode) return

    if (!this.monitorElement) {
      this.monitorElement = document.createElement('audio')
      this.monitorElement.autoplay = true
      this.monitorElement.muted = false
      this.monitorElement.volume = 1
    }

    if (this.monitorElement.srcObject !== this.destinationNode.stream) {
      this.monitorElement.srcObject = this.destinationNode.stream
    }

    void this.monitorElement.play().catch(() => {})
  }

  private applyLimiterSettings(): void {
    if (!this.limiterNode) return

    if (this.limiterEnabled) {
      this.limiterNode.threshold.value = -10
      this.limiterNode.knee.value = 12
      this.limiterNode.ratio.value = 8
      this.limiterNode.attack.value = 0.006
      this.limiterNode.release.value = 0.4
      return
    }

    this.limiterNode.threshold.value = 0
    this.limiterNode.knee.value = 0
    this.limiterNode.ratio.value = 1
    this.limiterNode.attack.value = 0.003
    this.limiterNode.release.value = 0.25
  }

  private stopGateLoop(): void {
    if (this.gateRafId !== null) {
      cancelAnimationFrame(this.gateRafId)
      this.gateRafId = null
    }
    this.gateData = null
  }

  private tickGate = (): void => {
    if (
      !this.inputLevelAnalyserNode ||
      !this.inputGateNode ||
      !this.audioContext ||
      !this.gateData
    ) {
      this.stopGateLoop()
      return
    }

    this.inputLevelAnalyserNode.getFloatTimeDomainData(this.gateData)

    let sumSquares = 0
    for (let i = 0; i < this.gateData.length; i += 1) {
      const sample = this.gateData[i]
      sumSquares += sample * sample
    }

    const rms = Math.sqrt(sumSquares / this.gateData.length)
    const isSpeaking = rms >= this.inputThreshold
    const gateTarget = this.inputThreshold <= 0 ? 1 : isSpeaking ? 1 : 0

    // Szybki atak (10ms) zapobiega ucinaniu początku słowa.
    // Długi release (400ms) pozwala końcówkom zdań płynnie wybrzmieć.
    const smoothing = isSpeaking ? 0.01 : 0.4

    this.inputGateNode.gain.setTargetAtTime(gateTarget, this.audioContext.currentTime, smoothing)

    this.gateRafId = requestAnimationFrame(this.tickGate)
  }

  private startGateLoop(): void {
    if (!this.inputLevelAnalyserNode) return

    this.stopGateLoop()
    this.gateData = new Float32Array(
      this.inputLevelAnalyserNode.fftSize
    ) as Float32Array<ArrayBuffer>
    this.gateRafId = requestAnimationFrame(this.tickGate)
  }

  private clearCurrentGraph(): void {
    this.stopGateLoop()

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect()
      } catch {
        console.warn('[MicrophoneService] Failed to disconnect source node')
      }
      this.sourceNode = null
    }

    if (this.inputGateNode) {
      try {
        this.inputGateNode.disconnect()
      } catch {
        console.warn('[MicrophoneService] Failed to disconnect input gate node')
      }
      this.inputGateNode = null
    }

    if (this.inputLevelAnalyserNode) {
      try {
        this.inputLevelAnalyserNode.disconnect()
      } catch {
        console.warn('[MicrophoneService] Failed to disconnect input level analyser node')
      }
      this.inputLevelAnalyserNode = null
    }

    if (this.highPassEQNode) {
      try {
        this.highPassEQNode.disconnect()
      } catch {
        console.warn('[MicrophoneService] Failed to disconnect high-pass node')
      }
      this.highPassEQNode = null
    }

    if (this.lowShelfEQNode) {
      try {
        this.lowShelfEQNode.disconnect()
      } catch {
        console.warn('[MicrophoneService] Failed to disconnect low-shelf node')
      }
      this.lowShelfEQNode = null
    }

    if (this.limiterNode) {
      try {
        this.limiterNode.disconnect()
      } catch {
        console.warn('[MicrophoneService] Failed to disconnect limiter node')
      }
      this.limiterNode = null
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

    this.syncMonitoringOutput()
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

      this.clearCurrentGraph()

      const nextSourceNode = this.audioContext.createMediaStreamSource(stream)
      const nextInputGate = this.audioContext.createGain()
      const nextInputLevelAnalyser = this.audioContext.createAnalyser()
      const nextHighPassEQ = this.audioContext.createBiquadFilter()
      const nextLowShelfEQ = this.audioContext.createBiquadFilter()
      const nextLimiter = this.audioContext.createDynamicsCompressor()
      const nextGainNode = this.audioContext.createGain()
      const nextAnalyserNode = this.audioContext.createAnalyser()
      const nextDestinationNode = this.audioContext.createMediaStreamDestination()

      nextInputGate.gain.value = 1
      nextInputLevelAnalyser.fftSize = 1024
      nextInputLevelAnalyser.smoothingTimeConstant = 0.1

      nextHighPassEQ.type = 'highpass'
      nextHighPassEQ.frequency.value = 80

      nextLowShelfEQ.type = 'lowshelf'
      nextLowShelfEQ.frequency.value = 150
      nextLowShelfEQ.gain.value = 0

      nextGainNode.gain.value = Math.max(0, Math.min(2, volume))
      nextAnalyserNode.fftSize = 1024
      nextAnalyserNode.smoothingTimeConstant = 0.2

      this.inputGateNode = nextInputGate
      this.inputLevelAnalyserNode = nextInputLevelAnalyser
      this.highPassEQNode = nextHighPassEQ
      this.lowShelfEQNode = nextLowShelfEQ
      this.limiterNode = nextLimiter

      nextSourceNode.connect(nextInputLevelAnalyser)
      nextSourceNode.connect(nextInputGate)
      nextInputGate.connect(nextHighPassEQ)
      nextHighPassEQ.connect(nextLowShelfEQ)
      nextLowShelfEQ.connect(nextLimiter)
      nextLimiter.connect(nextGainNode)
      nextGainNode.connect(nextAnalyserNode)
      nextGainNode.connect(nextDestinationNode)

      const processedTrack = nextDestinationNode.stream.getAudioTracks()[0] ?? null
      if (!processedTrack) {
        nextSourceNode.disconnect()
        nextInputGate.disconnect()
        nextInputLevelAnalyser.disconnect()
        nextHighPassEQ.disconnect()
        nextLowShelfEQ.disconnect()
        nextLimiter.disconnect()
        nextGainNode.disconnect()
        nextAnalyserNode.disconnect()
        nextDestinationNode.disconnect()
        stream.getTracks().forEach((track) => track.stop())
        this.inputGateNode = null
        this.inputLevelAnalyserNode = null
        this.highPassEQNode = null
        this.lowShelfEQNode = null
        this.limiterNode = null
        return null
      }

      processedTrack.contentHint = 'speech'

      this.currentStream = stream
      this.sourceNode = nextSourceNode
      this.inputGateNode = nextInputGate
      this.inputLevelAnalyserNode = nextInputLevelAnalyser
      this.highPassEQNode = nextHighPassEQ
      this.lowShelfEQNode = nextLowShelfEQ
      this.limiterNode = nextLimiter
      this.gainNode = nextGainNode
      this.analyserNode = nextAnalyserNode
      this.destinationNode = nextDestinationNode

      this.applyLimiterSettings()
      this.startGateLoop()
      this.syncMonitoringOutput()

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

  public setLimiter(enabled: boolean): void {
    this.limiterEnabled = enabled
    this.applyLimiterSettings()
  }

  public setLocalMonitoringEnabled(enabled: boolean): void {
    this.localMonitoringEnabled = enabled
    this.syncMonitoringOutput()
  }

  public getLocalMonitoringEnabled(): boolean {
    return this.localMonitoringEnabled
  }

  public setInputThreshold(threshold: number): void {
    this.inputThreshold = Math.max(0, Math.min(1, threshold))
  }

  public getInputThreshold(): number {
    return this.inputThreshold
  }

  public stop(): void {
    this.clearCurrentGraph()
  }
}

export const microphoneService = new MicrophoneService()
