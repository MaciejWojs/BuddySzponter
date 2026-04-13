export class NoiseGateEngine {
  private static readonly DEFAULT_HOLD_TIME = 0.5
  private static readonly DEFAULT_ATTACK_TIME = 0.015
  private static readonly DEFAULT_RELEASE_TIME = 1.0

  private threshold = 0.008
  private gateHoldTime = NoiseGateEngine.DEFAULT_HOLD_TIME
  private lastAboveThresholdTime = 0
  private gateAttackTime = NoiseGateEngine.DEFAULT_ATTACK_TIME
  private gateReleaseTime = NoiseGateEngine.DEFAULT_RELEASE_TIME
  private isGateOpen = true
  private noiseFloor = 0.002
  private currentDynamicThreshold = this.threshold
  private readonly NOISE_FLOOR_ALPHA = 0.95
  private readonly THRESHOLD_OFFSET = 2.5
  private smoothedRms = 0
  private readonly RMS_SMOOTHING = 0.85

  private rafId: number | null = null
  private gateData: Float32Array<ArrayBuffer> | null = null

  public constructor(
    private readonly audioContext: AudioContext,
    private readonly analyserNode: AnalyserNode,
    private readonly targetGainNode: GainNode
  ) {}

  public setThreshold(value: number): void {
    this.threshold = Math.max(0, Math.min(1, value))
    this.currentDynamicThreshold = this.threshold
  }

  public setGateParams(holdTimeSeconds: number, attackTime: number, releaseTime: number): void {
    this.gateHoldTime = Math.max(0, holdTimeSeconds)
    this.gateAttackTime = Math.max(0, attackTime)
    this.gateReleaseTime = Math.max(0, releaseTime)
  }

  public start(): void {
    this.stop()
    this.gateData = new Float32Array(this.analyserNode.fftSize) as Float32Array<ArrayBuffer>
    this.rafId = requestAnimationFrame(this.tickGate)
  }

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    this.lastAboveThresholdTime = 0
    this.isGateOpen = true
    this.gateData = null
  }

  private tickGate = (): void => {
    if (!this.gateData) {
      this.stop()
      return
    }

    this.analyserNode.getFloatTimeDomainData(this.gateData)

    let sumSquares = 0
    for (let i = 0; i < this.gateData.length; i += 1) {
      const sample = this.gateData[i]
      sumSquares += sample * sample
    }

    const currentRms = Math.sqrt(sumSquares / this.gateData.length)

    this.smoothedRms = this.RMS_SMOOTHING * this.smoothedRms + (1 - this.RMS_SMOOTHING) * currentRms

    const rms = this.smoothedRms

    if (!this.isGateOpen) {
      this.noiseFloor =
        this.NOISE_FLOOR_ALPHA * this.noiseFloor + (1 - this.NOISE_FLOOR_ALPHA) * rms
    }

    const dynamicThreshold =
      this.threshold > 0 ? this.threshold : this.noiseFloor * this.THRESHOLD_OFFSET
    this.currentDynamicThreshold = dynamicThreshold
    const now = this.audioContext.currentTime

    if (rms >= dynamicThreshold) {
      this.lastAboveThresholdTime = now
    }

    const shouldBeOpen = now - this.lastAboveThresholdTime < this.gateHoldTime

    if (shouldBeOpen !== this.isGateOpen) {
      this.isGateOpen = shouldBeOpen

      const currentGain = this.targetGainNode.gain.value

      this.targetGainNode.gain.cancelScheduledValues(now)
      this.targetGainNode.gain.setValueAtTime(currentGain, now)

      if (shouldBeOpen) {
        this.targetGainNode.gain.linearRampToValueAtTime(1, now + this.gateAttackTime)
      } else {
        const t1 = now + this.gateReleaseTime * 0.25
        const t2 = now + this.gateReleaseTime * 0.5
        const t3 = now + this.gateReleaseTime * 0.75
        const t4 = now + this.gateReleaseTime

        const easeOut = (progress: number): number => 1 - Math.pow(progress, 3)

        this.targetGainNode.gain.linearRampToValueAtTime(currentGain * easeOut(0.25), t1)
        this.targetGainNode.gain.linearRampToValueAtTime(currentGain * easeOut(0.5), t2)
        this.targetGainNode.gain.linearRampToValueAtTime(currentGain * easeOut(0.75), t3)
        this.targetGainNode.gain.linearRampToValueAtTime(0, t4)
      }
    }

    this.rafId = requestAnimationFrame(this.tickGate)
  }

  public getCurrentThreshold(): number {
    return this.currentDynamicThreshold
  }
}
