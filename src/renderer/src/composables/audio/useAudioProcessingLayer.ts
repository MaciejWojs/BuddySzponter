import { getAudioContext } from '@renderer/composables/useSharedAudioContext'

const clampVolume = (volume: number): number => Math.max(0, Math.min(2, volume))

interface UseAudioProcessingLayerResult {
  micGain: GainNode
  systemGain: GainNode
  systemDuckGain: GainNode
  micAnalyser: AnalyserNode
  connectToMasterBusInput: (inputNode: AudioNode) => void
  setMicVolume: (volume: number) => void
  setSystemVolume: (volume: number) => void
  destroy: () => void
}

export function useAudioProcessingLayer(): UseAudioProcessingLayerResult {
  const audioContext = getAudioContext()

  const micGain = audioContext.createGain()
  const systemGain = audioContext.createGain()
  const systemDuckGain = audioContext.createGain()
  const micAnalyser = audioContext.createAnalyser()

  micAnalyser.fftSize = 1024
  micAnalyser.smoothingTimeConstant = 0.85

  systemGain.connect(systemDuckGain)

  let connectedMasterInput: AudioNode | null = null
  let destroyed = false

  const disconnectMasterInput = (): void => {
    if (!connectedMasterInput) return

    try {
      micGain.disconnect(connectedMasterInput)
    } catch {
      console.warn('[AudioProcessingLayer] Failed to disconnect mic gain from master bus input')
    }

    try {
      systemDuckGain.disconnect(connectedMasterInput)
    } catch {
      console.warn(
        '[AudioProcessingLayer] Failed to disconnect system duck gain from master bus input'
      )
    }

    connectedMasterInput = null
  }

  const connectToMasterBusInput = (inputNode: AudioNode): void => {
    if (destroyed) return
    if (connectedMasterInput === inputNode) return

    disconnectMasterInput()
    micGain.connect(inputNode)
    systemDuckGain.connect(inputNode)
    connectedMasterInput = inputNode
  }

  const setMicVolume = (volume: number): void => {
    micGain.gain.value = clampVolume(volume)
  }

  const setSystemVolume = (volume: number): void => {
    systemGain.gain.value = clampVolume(volume)
  }

  const destroy = (): void => {
    if (destroyed) return
    destroyed = true

    disconnectMasterInput()

    try {
      systemGain.disconnect(systemDuckGain)
    } catch {
      console.warn('[AudioProcessingLayer] Failed to disconnect system gain from duck gain')
    }

    try {
      micGain.disconnect()
    } catch {
      console.warn('[AudioProcessingLayer] Failed to disconnect mic gain')
    }
    try {
      systemGain.disconnect()
    } catch {
      console.warn('[AudioProcessingLayer] Failed to disconnect system gain')
    }
    try {
      systemDuckGain.disconnect()
    } catch {
      console.warn('[AudioProcessingLayer] Failed to disconnect system duck gain')
    }
    try {
      micAnalyser.disconnect()
    } catch {
      console.warn('[AudioProcessingLayer] Failed to disconnect mic analyser')
    }
  }

  return {
    micGain,
    systemGain,
    systemDuckGain,
    micAnalyser,
    connectToMasterBusInput,
    setMicVolume,
    setSystemVolume,
    destroy
  }
}
