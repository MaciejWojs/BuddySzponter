import { getAudioContext, resumeAudioContext } from '@renderer/composables/useSharedAudioContext'
import { MicrophoneEffectsChain } from '@renderer/services/MicrophoneEffectsChain'
import { NoiseGateEngine } from '@renderer/services/NoiseGateEngine'

export interface AudioInputDeviceOption {
  deviceId: string
  label: string
}

export interface AudioOutputDeviceOption {
  deviceId: string
  label: string
}

class MicrophoneService {
  private currentStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private effectsChain: MicrophoneEffectsChain | null = null
  private noiseGate: NoiseGateEngine | null = null
  private limiterEnabled = true
  private bassBoostDb = 0
  private inputThreshold = 0.008
  private gateHoldTimeSeconds = 0.5
  private gateAttackTime = 0.015
  private gateReleaseTime = 1.0
  private autoGainControlEnabled = true
  private noiseSuppressionEnabled = true
  private echoCancellationEnabled = true
  private studioModeEnabled = false
  private voicePreset = 'none'

  private localMonitoringEnabled = false
  private monitoringOutputDeviceId = ''
  private monitorElement: HTMLAudioElement | null = null

  private syncMonitoringOutput(): void {
    if (!this.localMonitoringEnabled) {
      if (this.monitorElement) {
        this.monitorElement.pause()
        this.monitorElement.srcObject = null
      }
      return
    }

    const processedStream = this.effectsChain?.getProcessedStream() ?? null
    if (!processedStream) return

    if (!this.monitorElement) {
      this.monitorElement = document.createElement('audio')
      this.monitorElement.autoplay = true
      this.monitorElement.muted = false
      this.monitorElement.volume = 1
    }

    if (this.monitorElement.srcObject !== processedStream) {
      this.monitorElement.srcObject = processedStream
    }

    this.applyMonitoringSinkId()

    void this.monitorElement.play().catch(() => {})
  }

  private applyMonitoringSinkId(): void {
    if (!this.monitorElement) return

    const targetDeviceId = this.monitoringOutputDeviceId || ''
    const mediaElementWithSink = this.monitorElement as HTMLMediaElement & {
      setSinkId?: (sinkId: string) => Promise<void>
    }

    if (typeof mediaElementWithSink.setSinkId === 'function') {
      void mediaElementWithSink.setSinkId(targetDeviceId).catch((error) => {
        console.warn('[MicrophoneService] Nie udalo sie ustawic urzadzenia odsluchu:', error)
      })
    }
  }

  private clearCurrentGraph(): void {
    this.noiseGate?.stop()
    this.noiseGate = null

    this.effectsChain?.destroy()
    this.effectsChain = null

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

  public async getAvailableSpeakers(): Promise<AudioOutputDeviceOption[]> {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices
      .filter((device) => device.kind === 'audiooutput' && !!device.deviceId)
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Glosnik ${index + 1}`
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

      const nextEffectsChain = new MicrophoneEffectsChain(this.audioContext, stream)
      nextEffectsChain.setLimiter(this.limiterEnabled)
      nextEffectsChain.setVolume(volume)
      nextEffectsChain.setBassBoost(this.bassBoostDb)
      nextEffectsChain.setVoicePreset(this.voicePreset)

      const gateAnalyserNode = nextEffectsChain.getGateAnalyserNode()
      const gateTargetNode = nextEffectsChain.getGateTargetNode()
      const processedTrack = nextEffectsChain.getProcessedTrack()
      if (!processedTrack) {
        nextEffectsChain.destroy()
        stream.getTracks().forEach((track) => track.stop())
        this.effectsChain = null
        this.noiseGate = null
        return null
      }

      if (!gateAnalyserNode || !gateTargetNode) {
        nextEffectsChain.destroy()
        stream.getTracks().forEach((track) => track.stop())
        this.effectsChain = null
        this.noiseGate = null
        return null
      }

      const nextNoiseGate = new NoiseGateEngine(this.audioContext, gateAnalyserNode, gateTargetNode)
      nextNoiseGate.setThreshold(this.inputThreshold)
      nextNoiseGate.setGateParams(
        this.gateHoldTimeSeconds,
        this.gateAttackTime,
        this.gateReleaseTime
      )
      nextNoiseGate.start()

      processedTrack.contentHint = 'speech'

      this.currentStream = stream
      this.effectsChain = nextEffectsChain
      this.noiseGate = nextNoiseGate
      this.syncMonitoringOutput()

      return processedTrack
    } catch (error) {
      console.warn('[MicrophoneService] Nie udalo sie uruchomic mikrofonu:', error)
      return null
    }
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.effectsChain?.getFinalAnalyserNode() ?? null
  }

  public setVolume(volume: number): void {
    this.effectsChain?.setVolume(volume)
  }

  public setLimiter(enabled: boolean): void {
    this.limiterEnabled = enabled
    this.effectsChain?.setLimiter(enabled)
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

  public setMonitoringOutputDeviceId(deviceId: string): void {
    this.monitoringOutputDeviceId = deviceId || ''
    this.applyMonitoringSinkId()
  }

  public getMonitoringOutputDeviceId(): string {
    return this.monitoringOutputDeviceId
  }

  public getLocalMonitoringEnabled(): boolean {
    return this.localMonitoringEnabled
  }

  public setInputThreshold(threshold: number): void {
    this.inputThreshold = Math.max(0, Math.min(1, threshold))
    this.noiseGate?.setThreshold(this.inputThreshold)
  }

  public getInputThreshold(): number {
    return this.inputThreshold
  }

  public getCurrentGateThreshold(): number {
    return this.noiseGate?.getCurrentThreshold() ?? this.inputThreshold
  }

  public setGateParams(holdTimeSeconds: number, attackTime: number, releaseTime: number): void {
    this.gateHoldTimeSeconds = Math.max(0, holdTimeSeconds)
    this.gateAttackTime = Math.max(0, attackTime)
    this.gateReleaseTime = Math.max(0, releaseTime)
    this.noiseGate?.setGateParams(
      this.gateHoldTimeSeconds,
      this.gateAttackTime,
      this.gateReleaseTime
    )
  }

  public setBassBoost(dbValue: number): void {
    this.bassBoostDb = dbValue
    this.effectsChain?.setBassBoost(dbValue)
  }

  public setVoicePreset(name: string): void {
    this.voicePreset = name
    this.effectsChain?.setVoicePreset(name)
  }

  public stop(): void {
    this.clearCurrentGraph()
  }
}

export const microphoneService = new MicrophoneService()
