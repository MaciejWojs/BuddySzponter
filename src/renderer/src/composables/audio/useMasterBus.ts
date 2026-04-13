import { getAudioContext } from '@renderer/composables/useSharedAudioContext'

interface UseMasterBusResult {
  inputNode: GainNode
  destroy: () => void
}

interface UseMasterBusOptions {
  inputThreshold?: number
  limiterThreshold?: number
}

export function useMasterBus(options: UseMasterBusOptions = {}): UseMasterBusResult {
  const audioContext = getAudioContext()
  const inputNode = audioContext.createGain()
  const compressor = audioContext.createDynamicsCompressor()
  const limiter = audioContext.createDynamicsCompressor()

  compressor.threshold.value = options.inputThreshold ?? -10
  compressor.knee.value = 10
  compressor.ratio.value = 12
  compressor.attack.value = 0.003
  compressor.release.value = 0.25

  limiter.threshold.value = options.limiterThreshold ?? -1
  limiter.ratio.value = 20
  limiter.attack.value = 0.001
  limiter.release.value = 0.05

  let isConnected = false
  let isDestroyed = false

  const connectGraph = (): void => {
    if (isConnected || isDestroyed) return
    inputNode.connect(compressor)
    compressor.connect(limiter)
    limiter.connect(audioContext.destination)
    isConnected = true
  }

  const destroy = (): void => {
    if (isDestroyed) return
    isDestroyed = true

    try {
      inputNode.disconnect()
    } catch {
      console.warn('[MasterBus] Failed to disconnect input node')
    }
    try {
      compressor.disconnect()
    } catch {
      console.warn('[MasterBus] Failed to disconnect compressor')
    }
    try {
      limiter.disconnect()
    } catch {
      console.warn('[MasterBus] Failed to disconnect limiter')
    }

    isConnected = false
  }

  connectGraph()

  return {
    inputNode,
    destroy
  }
}
