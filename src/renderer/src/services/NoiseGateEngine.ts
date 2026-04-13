export class NoiseGateEngine {
  private static readonly DEFAULT_HOLD_FRAMES_MAX = 20
  private static readonly DEFAULT_ATTACK_TIME = 0.015
  private static readonly DEFAULT_RELEASE_TIME = 0.8

  private threshold = 0.008
  private gateHoldFramesCounter = 0
  private gateHoldFramesMax = NoiseGateEngine.DEFAULT_HOLD_FRAMES_MAX
  private gateAttackTime = NoiseGateEngine.DEFAULT_ATTACK_TIME
  private gateReleaseTime = NoiseGateEngine.DEFAULT_RELEASE_TIME
  private isGateOpen = true

  private rafId: number | null = null
  private gateData: Float32Array<ArrayBuffer> | null = null

  public constructor(
    private readonly audioContext: AudioContext,
    private readonly analyserNode: AnalyserNode,
    private readonly targetGainNode: GainNode
  ) {}

  public setThreshold(value: number): void {
    this.threshold = Math.max(0, Math.min(1, value))
  }

  public setGateParams(holdFrames: number, attackTime: number, releaseTime: number): void {
    this.gateHoldFramesMax = Math.max(0, holdFrames)
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

    this.gateHoldFramesCounter = 0
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

    const rms = Math.sqrt(sumSquares / this.gateData.length)

    if (rms >= this.threshold) {
      this.gateHoldFramesCounter = this.gateHoldFramesMax
    } else {
      this.gateHoldFramesCounter = Math.max(0, this.gateHoldFramesCounter - 1)
    }

    const shouldBeOpen = this.threshold <= 0 ? true : this.gateHoldFramesCounter > 0

    if (shouldBeOpen !== this.isGateOpen) {
      this.isGateOpen = shouldBeOpen

      const now = this.audioContext.currentTime
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

        const sCurve = (progress: number): number => (1 + Math.cos(Math.PI * progress)) * 0.5

        this.targetGainNode.gain.linearRampToValueAtTime(currentGain * sCurve(0.25), t1)
        this.targetGainNode.gain.linearRampToValueAtTime(currentGain * sCurve(0.5), t2)
        this.targetGainNode.gain.linearRampToValueAtTime(currentGain * sCurve(0.75), t3)
        this.targetGainNode.gain.linearRampToValueAtTime(currentGain * sCurve(1), t4)
      }
    }

    this.rafId = requestAnimationFrame(this.tickGate)
  }
}
