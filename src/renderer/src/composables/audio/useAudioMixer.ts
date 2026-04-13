import { onMounted, onUnmounted, watch } from 'vue'
import { useRemoteAudioTracks } from './useRemoteAudioTracks'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { getAudioContext, resumeAudioContext } from '@renderer/composables/useSharedAudioContext'
import { useAudioMixerEngine } from './useAudioMixerEngine'

type AudioMixerEngineHandle = ReturnType<typeof useAudioMixerEngine>

let sharedEngine: AudioMixerEngineHandle | null = null
let sharedEngineConsumers = 0

export function useAudioMixer(): {
  setMicVolume: (volume: number) => void
  setSystemVolume: (volume: number) => void
  unlock: () => Promise<void>
} {
  const webRtcStore = useWebRtcStore()
  const { micTrack, systemTrack } = useRemoteAudioTracks()
  const audioContext = getAudioContext()

  const getDuckingLevel = (): number => webRtcStore.audioDuckingLevel
  const getSpeechThreshold = (): number => webRtcStore.audioSpeechThreshold
  const getGainSmoothing = (): number => webRtcStore.audioGainSmoothing
  const getHoldFrames = (): number => webRtcStore.audioHoldFrames

  if (!sharedEngine) {
    sharedEngine = useAudioMixerEngine({
      micTrack,
      systemTrack,
      duckingLevel: getDuckingLevel(),
      speechThreshold: getSpeechThreshold(),
      smoothing: getGainSmoothing(),
      holdFrames: Math.round(getHoldFrames())
    })
  }
  sharedEngineConsumers += 1
  const engine = sharedEngine

  const ensureRunning = async (): Promise<void> => {
    if (audioContext.state === 'running') return
    try {
      await resumeAudioContext()
    } catch {
      console.warn('[AudioMixer] AudioContext resume failed')
    }
  }

  const setMicVolume = (v: number): void => {
    engine.setMicVolume(v)
  }
  const setSystemVolume = (v: number): void => {
    engine.setSystemVolume(v)
  }
  const unlock = async (): Promise<void> => await ensureRunning()

  const hasRemoteAudioTracks = (): boolean => {
    const stream = webRtcStore.remoteStream
    return Boolean(stream && stream.getAudioTracks().length > 0)
  }

  const syncMixerState = (): void => {
    if (webRtcStore.rtcStatus === 'disconnected') {
      engine.stop()
      return
    }

    if (hasRemoteAudioTracks()) {
      engine.start()
      return
    }

    engine.stop()
  }

  const unwatchMicVol = watch(() => webRtcStore.remoteMicVolume, setMicVolume, { immediate: true })
  const unwatchSysVol = watch(() => webRtcStore.remoteSystemVolume, setSystemVolume, {
    immediate: true
  })
  const unwatchRemoteStream = watch(() => webRtcStore.remoteStream, syncMixerState, {
    immediate: true
  })
  const unwatchRtcStatus = watch(() => webRtcStore.rtcStatus, syncMixerState, { immediate: true })

  const handleInteraction = (): void => void ensureRunning()

  onMounted(() => {
    document.addEventListener('click', handleInteraction, { once: true })
    document.addEventListener('touchstart', handleInteraction, { once: true })
  })

  onUnmounted(() => {
    unwatchMicVol()
    unwatchSysVol()
    unwatchRemoteStream()
    unwatchRtcStatus()

    document.removeEventListener('click', handleInteraction)
    document.removeEventListener('touchstart', handleInteraction)

    sharedEngineConsumers = Math.max(0, sharedEngineConsumers - 1)
    if (sharedEngineConsumers === 0 && sharedEngine) {
      sharedEngine.stop()
      sharedEngine.destroy()
      sharedEngine = null
    }
  })

  return { setMicVolume, setSystemVolume, unlock }
}
