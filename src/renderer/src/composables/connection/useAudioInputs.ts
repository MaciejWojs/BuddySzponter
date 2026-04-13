import { onUnmounted, ref, watch, type Ref } from 'vue'
import { getAudioContext } from '@renderer/composables/useSharedAudioContext'

type MaybeTrack = MediaStreamTrack | null

interface InputState {
  id: string | null
  stream: MediaStream | null
  dummy: HTMLAudioElement | null
  source: MediaStreamAudioSourceNode | null
}

interface UseAudioInputsOptions {
  micTrack: Ref<MaybeTrack>
  systemTrack: Ref<MaybeTrack>
}

interface UseAudioInputsResult {
  micSource: Ref<MediaStreamAudioSourceNode | null>
  systemSource: Ref<MediaStreamAudioSourceNode | null>
}

const disconnectState = (
  state: InputState,
  target: Ref<MediaStreamAudioSourceNode | null>,
  label: 'mic' | 'system'
): void => {
  if (state.source) {
    try {
      state.source.disconnect()
    } catch {
      console.warn(`[useAudioInputs] Failed to disconnect previous ${label} source node`)
    }
  }

  if (state.dummy) {
    state.dummy.srcObject = null
    state.dummy = null
  }

  target.value = null
  state.id = null
  state.stream = null
  state.source = null
}

const syncInputSource = (
  track: MaybeTrack,
  state: InputState,
  target: Ref<MediaStreamAudioSourceNode | null>,
  audioContext: AudioContext,
  label: 'mic' | 'system'
): void => {
  const nextTrackId = track?.id ?? null
  if (nextTrackId === state.id) return

  disconnectState(state, target, label)
  if (!track) return

  state.id = nextTrackId
  state.stream = new MediaStream([track])

  // Keep stream alive on browsers/environments that gate audio pipelines without a media element.
  state.dummy = new Audio()
  state.dummy.muted = true
  state.dummy.srcObject = state.stream
  void state.dummy.play().catch(() => {})

  state.source = audioContext.createMediaStreamSource(state.stream)
  target.value = state.source
}

export function useAudioInputs(options: UseAudioInputsOptions): UseAudioInputsResult {
  const { micTrack, systemTrack } = options
  const audioContext = getAudioContext()

  const micSource = ref<MediaStreamAudioSourceNode | null>(null)
  const systemSource = ref<MediaStreamAudioSourceNode | null>(null)

  const micState: InputState = { id: null, stream: null, dummy: null, source: null }
  const systemState: InputState = { id: null, stream: null, dummy: null, source: null }

  const unwatchMic = watch(
    micTrack,
    (track) => {
      syncInputSource(track, micState, micSource, audioContext, 'mic')
    },
    { immediate: true }
  )

  const unwatchSystem = watch(
    systemTrack,
    (track) => {
      syncInputSource(track, systemState, systemSource, audioContext, 'system')
    },
    { immediate: true }
  )

  onUnmounted(() => {
    unwatchMic()
    unwatchSystem()

    disconnectState(micState, micSource, 'mic')
    disconnectState(systemState, systemSource, 'system')
  })

  return {
    micSource,
    systemSource
  }
}
