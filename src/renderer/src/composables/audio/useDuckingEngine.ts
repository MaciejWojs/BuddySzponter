interface UseDuckingEngineOptions {
  analyserNode: AnalyserNode
  targetGainNode: GainNode
  duckingLevel?: number
  speechThreshold?: number
  smoothing?: number
  holdFrames?: number
}

interface UseDuckingEngineResult {
  start: () => void
  stop: () => void
}

const clampDuckingLevel = (value: number): number => Math.max(0, Math.min(1, value))

export function useDuckingEngine(options: UseDuckingEngineOptions): UseDuckingEngineResult {
  const analyserNode = options.analyserNode
  const targetGainNode = options.targetGainNode
  const duckingLevel = clampDuckingLevel(options.duckingLevel ?? 0.3)
  const speechThreshold = options.speechThreshold ?? 0.02
  const smoothing = options.smoothing ?? 0.08
  const holdFrames = Math.max(0, Math.floor(options.holdFrames ?? 8))

  const analyserBuffer = new Uint8Array(analyserNode.fftSize)
  let frameId: number | null = null
  let running = false
  let speechHoldCounter = 0

  const tick = (): void => {
    analyserNode.getByteTimeDomainData(analyserBuffer)

    let sum = 0
    for (let i = 0; i < analyserBuffer.length; i++) {
      const normalized = analyserBuffer[i] / 128 - 1
      sum += normalized * normalized
    }

    const rms = Math.sqrt(sum / analyserBuffer.length)
    const speaking = rms > speechThreshold

    if (speaking) {
      speechHoldCounter = holdFrames
    } else {
      speechHoldCounter = Math.max(0, speechHoldCounter - 1)
    }

    const nextGain = speechHoldCounter > 0 ? duckingLevel : 1
    const now = analyserNode.context.currentTime

    targetGainNode.gain.cancelScheduledValues(now)
    targetGainNode.gain.setTargetAtTime(nextGain, now, smoothing)

    frameId = globalThis.requestAnimationFrame(tick)
  }

  const start = (): void => {
    if (running) return
    running = true
    frameId = globalThis.requestAnimationFrame(tick)
  }

  const stop = (): void => {
    if (!running) return
    running = false

    if (frameId !== null) {
      globalThis.cancelAnimationFrame(frameId)
      frameId = null
    }

    speechHoldCounter = 0
    const now = analyserNode.context.currentTime
    targetGainNode.gain.cancelScheduledValues(now)
    targetGainNode.gain.setTargetAtTime(1, now, smoothing)
  }

  return {
    start,
    stop
  }
}
