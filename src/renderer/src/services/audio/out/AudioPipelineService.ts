// services/audio/AudioPipelineService.ts
import { getAudioContext, resumeAudioContext } from '@renderer/composables/useSharedAudioContext'

export class AudioPipelineService {
  private ctx = getAudioContext()

  private micSource: MediaStreamAudioSourceNode | null = null
  private systemSource: MediaStreamAudioSourceNode | null = null

  private micGain = this.ctx.createGain()
  private systemGain = this.ctx.createGain()
  private mixOutput = this.ctx.createMediaStreamDestination()

  private duckingLevel = 0.3
  private speechThreshold = 0.02

  constructor() {
    this.micGain.connect(this.mixOutput)
    this.systemGain.connect(this.mixOutput)

    void resumeAudioContext().catch(() => {})
  }

  // -------------------------
  // INPUT BINDING
  // -------------------------

  setMicStream(stream: MediaStream | null): void {
    if (!stream) return

    this.micSource?.disconnect()

    this.micSource = this.ctx.createMediaStreamSource(stream)
    this.micSource.connect(this.micGain)
  }

  setSystemStream(stream: MediaStream | null): void {
    if (!stream) return

    this.systemSource?.disconnect()

    this.systemSource = this.ctx.createMediaStreamSource(stream)
    this.systemSource.connect(this.systemGain)
  }

  // -------------------------
  // OUTPUT
  // -------------------------

  getMixedStream(): MediaStream {
    return this.mixOutput.stream
  }

  // -------------------------
  // VOLUMES
  // -------------------------

  setMicVolume(v: number): void {
    this.micGain.gain.value = Math.max(0, Math.min(2, v))
  }

  setSystemVolume(v: number): void {
    this.systemGain.gain.value = Math.max(0, Math.min(2, v))
  }

  // -------------------------
  // DUCKING ENGINE
  // -------------------------

  setDucking(level: number): void {
    this.duckingLevel = level
  }

  setSpeechThreshold(v: number): void {
    this.speechThreshold = v
  }

  /**
   * Prosty real-time ducking:
   * jeśli mic > threshold → ścisz system
   */
  startDuckingMonitor(): void {
    const analyser = this.ctx.createAnalyser()
    analyser.fftSize = 512

    this.micGain.connect(analyser)

    const data = new Uint8Array(analyser.frequencyBinCount)

    const loop = (): void => {
      analyser.getByteFrequencyData(data)

      const avg = data.reduce((a, b) => a + b, 0) / data.length / 255

      if (avg > this.speechThreshold) {
        this.systemGain.gain.value = 1 - this.duckingLevel
      } else {
        this.systemGain.gain.value = 1
      }

      requestAnimationFrame(loop)
    }

    loop()
  }

  // -------------------------
  // CLEANUP
  // -------------------------

  stop(): void {
    this.micSource?.disconnect()
    this.systemSource?.disconnect()

    this.micSource = null
    this.systemSource = null
  }
}

export const audioPipeline = new AudioPipelineService()
