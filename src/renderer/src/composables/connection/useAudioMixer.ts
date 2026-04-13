import { onMounted, onUnmounted, watch } from 'vue'
import { useRemoteAudioTracks } from './useRemoteAudioTracks'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { getAudioContext, resumeAudioContext } from '@renderer/composables/useSharedAudioContext'

const clampVolume = (volume: number): number => Math.max(0, Math.min(2, volume))

interface TrackState {
  id: string | null
  stream: MediaStream | null
  dummy: HTMLAudioElement | null
  source: MediaStreamAudioSourceNode | null
}

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

  const micState: TrackState = { id: null, stream: null, dummy: null, source: null }
  const sysState: TrackState = { id: null, stream: null, dummy: null, source: null }

  let duckingFrameId: number | null = null
  let speechHoldFrames = 0

  const ensureRunning = async (): Promise<void> => {
    if (audioContext.state === 'running') return
    try {
      await resumeAudioContext()
    } catch {
      console.warn('[AudioMixer] AudioContext resume failed')
    }
  }

  const syncTrack = (
    track: MediaStreamTrack | null,
    state: TrackState,
    targetGain: GainNode,
    extraTarget?: AnalyserNode
  ): void => {
    const nextTrackId = track?.id ?? null
    if (nextTrackId === state.id) return

    if (state.source) {
      try {
        state.source.disconnect()
      } catch {
        console.warn('[AudioMixer] Failed to disconnect previous source node')
      }
    }
    if (state.dummy) state.dummy.srcObject = null

    Object.assign(state, { id: nextTrackId, stream: null, dummy: null, source: null })

    if (!track) return

    void ensureRunning()

    state.stream = new MediaStream([track])

    state.dummy = new Audio()
    state.dummy.muted = true
    state.dummy.srcObject = state.stream
    void state.dummy.play().catch(() => {})

    state.source = audioContext.createMediaStreamSource(state.stream)
    state.source.connect(targetGain)
    if (extraTarget) state.source.connect(extraTarget)

    console.info(`[AudioMixer] Track connected: ${track.kind}`, { id: track.id })
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

  const unwatchMic = watch(micTrack, (t) => syncTrack(t, micState, micGain, micAnalyser), {
    immediate: true
  })
  const unwatchSys = watch(systemTrack, (t) => syncTrack(t, sysState, systemGain), {
    immediate: true
  })
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
    unwatchMic()
    unwatchSys()
    unwatchMicVol()
    unwatchSysVol()

    document.removeEventListener('click', handleInteraction)
    document.removeEventListener('touchstart', handleInteraction)

    if (duckingFrameId !== null) globalThis.cancelAnimationFrame(duckingFrameId)

    syncTrack(null, micState, micGain)
    syncTrack(null, sysState, systemGain)

    micGain.disconnect()
    systemGain.disconnect()
    systemDuckGain.disconnect()
    micAnalyser.disconnect()
    compressor.disconnect()
  })

  return { setMicVolume, setSystemVolume, unlock }
}
