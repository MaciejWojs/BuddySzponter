import { getAudioContext } from '@renderer/composables/useSharedAudioContext'

interface UseMasterBusResult {
  inputNode: GainNode
  destroy: () => void
}

export function useMasterBus(): UseMasterBusResult {
  const audioContext = getAudioContext()
  const inputNode = audioContext.createGain()
  const compressor = audioContext.createDynamicsCompressor()

  compressor.threshold.value = -10
  compressor.knee.value = 10
  compressor.ratio.value = 12
  compressor.attack.value = 0.003
  compressor.release.value = 0.25

  let isConnected = false
  let isDestroyed = false

  const connectGraph = (): void => {
    if (isConnected || isDestroyed) return
    inputNode.connect(compressor)
    compressor.connect(audioContext.destination)
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

    isConnected = false
  }

  connectGraph()

  return {
    inputNode,
    destroy
  }
}
