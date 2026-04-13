import { onMounted, onUnmounted, watch } from 'vue'
import { useRemoteAudioTracks } from './useRemoteAudioTracks'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { getAudioContext, resumeAudioContext } from '@renderer/composables/useSharedAudioContext'
import { useAudioMixerEngine } from './useAudioMixerEngine'

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
  const audioContext = getAudioContext()

  const engine = useAudioMixerEngine({
    micTrack,
    systemTrack,
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

  engine.start()

  const setMicVolume = (v: number): void => {
    engine.setMicVolume(v)
  }
  const setSystemVolume = (v: number): void => {
    engine.setSystemVolume(v)
  }
  const unlock = async (): Promise<void> => await ensureRunning()

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
    unwatchMicVol()
    unwatchSysVol()

    document.removeEventListener('click', handleInteraction)
    document.removeEventListener('touchstart', handleInteraction)

    engine.stop()
  })

  return { setMicVolume, setSystemVolume, unlock }
}
