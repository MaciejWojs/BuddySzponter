import { onMounted, onUnmounted, watch } from 'vue'
import { useRemoteAudioTracks } from './useRemoteAudioTracks'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { getAudioContext, resumeAudioContext } from '@renderer/composables/useSharedAudioContext'
import { useAudioInputs } from './useAudioInputs'

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
  const compressor = audioContext.createDynamicsCompressor()

  micAnalyser.fftSize = 1024
  micAnalyser.smoothingTimeConstant = 0.85

  compressor.threshold.value = -10
  compressor.knee.value = 10
  compressor.ratio.value = 12
  compressor.attack.value = 0.003
  compressor.release.value = 0.25

  micGain.connect(compressor)
  systemGain.connect(systemDuckGain)
  systemDuckGain.connect(compressor)
  compressor.connect(audioContext.destination)

  let duckingFrameId: number | null = null
  let speechHoldFrames = 0
  let connectedMicSource: MediaStreamAudioSourceNode | null = null
  let connectedSystemSource: MediaStreamAudioSourceNode | null = null

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

  const analyserBuffer = new Uint8Array(micAnalyser.fftSize)

  const duckingLoop = (): void => {
    micAnalyser.getByteTimeDomainData(analyserBuffer)
    let sum = 0
    for (let i = 0; i < analyserBuffer.length; i++) {
      const normalized = analyserBuffer[i] / 128 - 1
      sum += normalized * normalized
    }

    const speakingNow = Math.sqrt(sum / analyserBuffer.length) > SPEECH_THRESHOLD

    if (speakingNow) {
      speechHoldFrames = 8
    } else {
      speechHoldFrames = Math.max(0, speechHoldFrames - 1)
    }

    const targetGain = speechHoldFrames > 0 ? DUCKED_SYSTEM_GAIN : 1
    const now = audioContext.currentTime

    systemDuckGain.gain.cancelScheduledValues(now)
    systemDuckGain.gain.setTargetAtTime(targetGain, now, GAIN_SMOOTHING)

    duckingFrameId = globalThis.requestAnimationFrame(duckingLoop)
  }

  duckingFrameId = globalThis.requestAnimationFrame(duckingLoop)

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

    if (duckingFrameId !== null) globalThis.cancelAnimationFrame(duckingFrameId)

    reconnectMicSource(null)
    reconnectSystemSource(null)

    micGain.disconnect()
    systemGain.disconnect()
    systemDuckGain.disconnect()
    micAnalyser.disconnect()
    compressor.disconnect()
  })

  return { setMicVolume, setSystemVolume, unlock }
}
