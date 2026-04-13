import { onUnmounted, watch, type Ref } from 'vue'
import { getAudioContext, resumeAudioContext } from '@renderer/composables/useSharedAudioContext'
import { useAudioInputs } from './useAudioInputs'
import { useAudioProcessingLayer } from './useAudioProcessingLayer'
import { useDuckingEngine } from './useDuckingEngine'
import { useMasterBus } from './useMasterBus'

type MaybeTrack = MediaStreamTrack | null

interface UseAudioMixerEngineOptions {
  micTrack: Ref<MaybeTrack>
  systemTrack: Ref<MaybeTrack>
  duckingLevel?: number
  speechThreshold?: number
  smoothing?: number
  holdFrames?: number
}

interface UseAudioMixerEngineResult {
  setMicVolume: (volume: number) => void
  setSystemVolume: (volume: number) => void
  start: () => void
  stop: () => void
}

export function useAudioMixerEngine(
  options: UseAudioMixerEngineOptions
): UseAudioMixerEngineResult {
  const audioContext = getAudioContext()
  const { micSource, systemSource } = useAudioInputs({
    micTrack: options.micTrack,
    systemTrack: options.systemTrack
  })
  const processingLayer = useAudioProcessingLayer()
  const masterBus = useMasterBus()

  processingLayer.connectToMasterBusInput(masterBus.inputNode)

  const duckingEngine = useDuckingEngine({
    analyserNode: processingLayer.micAnalyser,
    targetGainNode: processingLayer.systemDuckGain,
    duckingLevel: options.duckingLevel,
    speechThreshold: options.speechThreshold,
    smoothing: options.smoothing,
    holdFrames: options.holdFrames
  })

  let started = false
  let destroyed = false
  let connectedMicSource: MediaStreamAudioSourceNode | null = null
  let connectedSystemSource: MediaStreamAudioSourceNode | null = null

  const ensureRunning = async (): Promise<void> => {
    if (audioContext.state === 'running') return

    try {
      await resumeAudioContext()
    } catch {
      console.warn('[AudioMixerEngine] AudioContext resume failed')
    }
  }

  const reconnectMicSource = (nextSource: MediaStreamAudioSourceNode | null): void => {
    if (nextSource === connectedMicSource && started) return

    if (connectedMicSource) {
      try {
        connectedMicSource.disconnect(processingLayer.micGain)
      } catch {
        console.warn('[AudioMixerEngine] Failed to disconnect previous mic source from mic gain')
      }
      try {
        connectedMicSource.disconnect(processingLayer.micAnalyser)
      } catch {
        console.warn('[AudioMixerEngine] Failed to disconnect previous mic source from analyser')
      }
    }

    connectedMicSource = null

    if (!started || !nextSource) return

    connectedMicSource = nextSource
    connectedMicSource.connect(processingLayer.micGain)
    connectedMicSource.connect(processingLayer.micAnalyser)
    void ensureRunning()
  }

  const reconnectSystemSource = (nextSource: MediaStreamAudioSourceNode | null): void => {
    if (nextSource === connectedSystemSource && started) return

    if (connectedSystemSource) {
      try {
        connectedSystemSource.disconnect(processingLayer.systemGain)
      } catch {
        console.warn(
          '[AudioMixerEngine] Failed to disconnect previous system source from system gain'
        )
      }
    }

    connectedSystemSource = null

    if (!started || !nextSource) return

    connectedSystemSource = nextSource
    connectedSystemSource.connect(processingLayer.systemGain)
    void ensureRunning()
  }

  const unwatchMicSource = watch(
    micSource,
    (nextSource) => {
      reconnectMicSource(nextSource)
    },
    { immediate: true }
  )

  const unwatchSystemSource = watch(
    systemSource,
    (nextSource) => {
      reconnectSystemSource(nextSource)
    },
    { immediate: true }
  )

  const start = (): void => {
    if (destroyed || started) return
    started = true

    reconnectMicSource(micSource.value)
    reconnectSystemSource(systemSource.value)
    duckingEngine.start()
    void ensureRunning()
  }

  const stop = (): void => {
    if (destroyed || !started) return
    started = false

    duckingEngine.stop()
    reconnectMicSource(null)
    reconnectSystemSource(null)
  }

  const destroy = (): void => {
    if (destroyed) return
    destroyed = true

    stop()
    unwatchMicSource()
    unwatchSystemSource()
    processingLayer.destroy()
    masterBus.destroy()
  }

  onUnmounted(() => {
    destroy()
  })

  return {
    setMicVolume: processingLayer.setMicVolume,
    setSystemVolume: processingLayer.setSystemVolume,
    start,
    stop
  }
}
