import { onMounted, onUnmounted, watch } from 'vue'
import { useRemoteAudioTracks } from './useRemoteAudioTracks'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { getAudioContext, resumeAudioContext } from '@renderer/composables/useSharedAudioContext'
import { useAudioInputs } from './useAudioInputs'
import { useDuckingEngine } from './useDuckingEngine'
import { useMasterBus } from './useMasterBus'

const clampVolume = (volume: number): number => Math.max(0, Math.min(2, volume))

export function useAudioMixer(): {
  setMicVolume: (volume: number) => void
  setSystemVolume: (volume: number) => void
  unlock: () => Promise<void>
} {
  const DUCKED_SYSTEM_GAIN = 0.3
  const SPEECH_THRESHOLD = 0.02
  const GAIN_SMOOTHING = 0.08

  const webRtcStore = useWebRtcStore()
  const { micTrack, systemTrack } = useRemoteAudioTracks()
  const { micSource, systemSource } = useAudioInputs({ micTrack, systemTrack })
  const audioContext = getAudioContext()

  const micGain = audioContext.createGain()
  const systemGain = audioContext.createGain()
  const systemDuckGain = audioContext.createGain()
  const micAnalyser = audioContext.createAnalyser()
  const masterBus = useMasterBus()

  micAnalyser.fftSize = 1024
  micAnalyser.smoothingTimeConstant = 0.85

  micGain.connect(masterBus.inputNode)
  systemGain.connect(systemDuckGain)
  systemDuckGain.connect(masterBus.inputNode)

  let connectedMicSource: MediaStreamAudioSourceNode | null = null
  let connectedSystemSource: MediaStreamAudioSourceNode | null = null

  const duckingEngine = useDuckingEngine({
    analyserNode: micAnalyser,
    targetGainNode: systemDuckGain,
    duckingLevel: DUCKED_SYSTEM_GAIN,
    speechThreshold: SPEECH_THRESHOLD,
    smoothing: GAIN_SMOOTHING,
    holdFrames: 8
  })

  const ensureRunning = async (): Promise<void> => {
    if (audioContext.state === 'running') return
    try {
      await resumeAudioContext()
    } catch {
      console.warn('[AudioMixer] AudioContext resume failed')
    }
  }

  const reconnectMicSource = (nextSource: MediaStreamAudioSourceNode | null): void => {
    if (nextSource === connectedMicSource) return

    if (connectedMicSource) {
      try {
        connectedMicSource.disconnect(micGain)
      } catch {
        console.warn('[AudioMixer] Failed to disconnect previous mic source from gain')
      }
      try {
        connectedMicSource.disconnect(micAnalyser)
      } catch {
        console.warn('[AudioMixer] Failed to disconnect previous mic source from analyser')
      }
    }

    connectedMicSource = nextSource

    if (connectedMicSource) {
      connectedMicSource.connect(micGain)
      connectedMicSource.connect(micAnalyser)
      void ensureRunning()
    }
  }

  const reconnectSystemSource = (nextSource: MediaStreamAudioSourceNode | null): void => {
    if (nextSource === connectedSystemSource) return

    if (connectedSystemSource) {
      try {
        connectedSystemSource.disconnect(systemGain)
      } catch {
        console.warn('[AudioMixer] Failed to disconnect previous system source from gain')
      }
    }

    connectedSystemSource = nextSource

    if (connectedSystemSource) {
      connectedSystemSource.connect(systemGain)
      void ensureRunning()
    }
  }

  duckingEngine.start()

  const setMicVolume = (v: number): void => {
    micGain.gain.value = clampVolume(v)
  }
  const setSystemVolume = (v: number): void => {
    systemGain.gain.value = clampVolume(v)
  }
  const unlock = async (): Promise<void> => await ensureRunning()

  const unwatchMicSource = watch(micSource, reconnectMicSource, { immediate: true })
  const unwatchSystemSource = watch(systemSource, reconnectSystemSource, { immediate: true })
  const unwatchMicVol = watch(() => webRtcStore.remoteMicVolume, setMicVolume, { immediate: true })
  const unwatchSysVol = watch(() => webRtcStore.remoteSystemVolume, setSystemVolume, {
    immediate: true
  })

  const handleInteraction = (): void => void ensureRunning()

  onMounted(() => {
    document.addEventListener('click', handleInteraction, { once: true })
    document.addEventListener('touchstart', handleInteraction, { once: true })
  })

  onUnmounted(() => {
    unwatchMicSource()
    unwatchSystemSource()
    unwatchMicVol()
    unwatchSysVol()

    document.removeEventListener('click', handleInteraction)
    document.removeEventListener('touchstart', handleInteraction)

    duckingEngine.stop()

    reconnectMicSource(null)
    reconnectSystemSource(null)

    micGain.disconnect()
    systemGain.disconnect()
    systemDuckGain.disconnect()
    micAnalyser.disconnect()
    masterBus.destroy()
  })

  return { setMicVolume, setSystemVolume, unlock }
}
