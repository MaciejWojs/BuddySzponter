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
  private highShelfEQNode: BiquadFilterNode | null = null
  private limiterNode: DynamicsCompressorNode | null = null
  private gainNode: GainNode | null = null
  private destinationNode: MediaStreamAudioDestinationNode | null = null
  private analyserNode: AnalyserNode | null = null
  private limiterEnabled = true
  private inputThreshold = 0.008
  private autoGainControlEnabled = true
  private noiseSuppressionEnabled = true
  private echoCancellationEnabled = true
  private studioModeEnabled = false

  // Parametry Bramki Szumów
  private gateHoldFramesCounter = 0
  private gateHoldFramesMax = 20
  private isGateOpen = true
  private gateAttackTime = 0.015
  private gateReleaseTime = 0.8 // Wydłużony czas na naturalne opadanie

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
      this.limiterNode.threshold.value = -18
      this.limiterNode.knee.value = 12
      this.limiterNode.ratio.value = 4
      this.limiterNode.attack.value = 0.005
      this.limiterNode.release.value = 0.15
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
    this.gateHoldFramesCounter = 0
    this.isGateOpen = true
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

    // Logika Podtrzymania (Hold)
    if (rms >= this.inputThreshold) {
      this.gateHoldFramesCounter = this.gateHoldFramesMax
    } else {
      this.gateHoldFramesCounter = Math.max(0, this.gateHoldFramesCounter - 1)
    }

    const shouldBeOpen = this.inputThreshold <= 0 ? true : this.gateHoldFramesCounter > 0

    // Reagujemy tylko wtedy, gdy stan bramki (otwarta/zamknięta) ulega zmianie
    if (shouldBeOpen !== this.isGateOpen) {
      this.isGateOpen = shouldBeOpen

      const now = this.audioContext.currentTime
      const currentGain = this.inputGateNode.gain.value

      this.inputGateNode.gain.cancelScheduledValues(now)
      this.inputGateNode.gain.setValueAtTime(currentGain, now)

      if (shouldBeOpen) {
        this.inputGateNode.gain.linearRampToValueAtTime(1, now + this.gateAttackTime)
      } else {
        const t1 = now + this.gateReleaseTime * 0.25
        const t2 = now + this.gateReleaseTime * 0.5
        const t3 = now + this.gateReleaseTime * 0.75
        const t4 = now + this.gateReleaseTime

        this.inputGateNode.gain.linearRampToValueAtTime(currentGain * 0.98, t1)
        this.inputGateNode.gain.linearRampToValueAtTime(currentGain * 0.85, t2)
        this.inputGateNode.gain.linearRampToValueAtTime(currentGain * 0.5, t3)
        this.inputGateNode.gain.linearRampToValueAtTime(0, t4)
      }
    }

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

    if (this.highShelfEQNode) {
      try {
        this.highShelfEQNode.disconnect()
      } catch {
        console.warn('[MicrophoneService] Failed to disconnect high-shelf node')
      }
      this.highShelfEQNode = null
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
      const audioConstraints = this.studioModeEnabled
        ? ({
            autoGainControl: false,
            noiseSuppression: false,
            echoCancellation: false,
            ...(deviceId ? { deviceId: { exact: deviceId } } : {})
          } as unknown as MediaTrackConstraints)
        : ({
            autoGainControl: this.autoGainControlEnabled,
            noiseSuppression: this.noiseSuppressionEnabled,
            echoCancellation: this.echoCancellationEnabled,
            advanced: [
              { googAutoGainControl: this.autoGainControlEnabled },
              { googNoiseSuppression: this.noiseSuppressionEnabled }
            ],
            ...(deviceId ? { deviceId: { exact: deviceId } } : {})
          } as unknown as MediaTrackConstraints)

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
      const nextHighShelfEQ = this.audioContext.createBiquadFilter()
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
      nextLowShelfEQ.gain.value = 3

      nextHighShelfEQ.type = 'highshelf'
      nextHighShelfEQ.frequency.value = 5000
      nextHighShelfEQ.gain.value = 3

      nextGainNode.gain.value = Math.max(0, Math.min(2, volume))
      nextAnalyserNode.fftSize = 1024
      nextAnalyserNode.smoothingTimeConstant = 0.2

      this.inputGateNode = nextInputGate
      this.inputLevelAnalyserNode = nextInputLevelAnalyser
      this.highPassEQNode = nextHighPassEQ
      this.lowShelfEQNode = nextLowShelfEQ
      this.highShelfEQNode = nextHighShelfEQ
      this.limiterNode = nextLimiter

      nextSourceNode.connect(nextInputLevelAnalyser)
      nextSourceNode.connect(nextInputGate)
      nextInputGate.connect(nextHighPassEQ)
      nextHighPassEQ.connect(nextLowShelfEQ)
      nextLowShelfEQ.connect(nextHighShelfEQ)
      nextHighShelfEQ.connect(nextLimiter)
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
        nextHighShelfEQ.disconnect()
        nextLimiter.disconnect()
        nextGainNode.disconnect()
        nextAnalyserNode.disconnect()
        nextDestinationNode.disconnect()
        stream.getTracks().forEach((track) => track.stop())
        this.inputGateNode = null
        this.inputLevelAnalyserNode = null
        this.highPassEQNode = null
        this.lowShelfEQNode = null
        this.highShelfEQNode = null
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
      this.highShelfEQNode = nextHighShelfEQ
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

  /** UWAGA: Zmiana tej flagi wymaga ponownego wywolania metody start(), aby pobrac nowy strumien z urzadzenia. */
  public setAutoGainControlEnabled(enabled: boolean): void {
    this.autoGainControlEnabled = enabled
  }

  public getAutoGainControlEnabled(): boolean {
    return this.autoGainControlEnabled
  }

  /** UWAGA: Zmiana tej flagi wymaga ponownego wywolania metody start(), aby pobrac nowy strumien z urzadzenia. */
  public setNoiseSuppressionEnabled(enabled: boolean): void {
    this.noiseSuppressionEnabled = enabled
  }

  public getNoiseSuppressionEnabled(): boolean {
    return this.noiseSuppressionEnabled
  }

  /** UWAGA: Zmiana tej flagi wymaga ponownego wywolania metody start(), aby pobrac nowy strumien z urzadzenia. */
  public setEchoCancellationEnabled(enabled: boolean): void {
    this.echoCancellationEnabled = enabled
  }

  public getEchoCancellationEnabled(): boolean {
    return this.echoCancellationEnabled
  }

  /** UWAGA: Zmiana tej flagi wymaga ponownego wywolania metody start(), aby pobrac nowy strumien z urzadzenia. */
  public setStudioModeEnabled(enabled: boolean): void {
    this.studioModeEnabled = enabled
  }

  public getStudioModeEnabled(): boolean {
    return this.studioModeEnabled
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

  public setGateParams(holdFrames: number, attackTime: number, releaseTime: number): void {
    this.gateHoldFramesMax = Math.max(0, holdFrames)
    this.gateAttackTime = Math.max(0, attackTime)
    this.gateReleaseTime = Math.max(0, releaseTime)
  }

  public setBassBoost(dbValue: number): void {
    if (this.lowShelfEQNode) {
      this.lowShelfEQNode.gain.value = dbValue
    }
  }

  public stop(): void {
    this.clearCurrentGraph()
  }
}

export const microphoneService = new MicrophoneService()
