import { computed, type ComputedRef } from 'vue'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'

export type RemoteAudioRole = 'speech' | 'music'

const resolveRemoteAudioRole = (
  store: ReturnType<typeof useWebRtcStore>,
  track: MediaStreamTrack
): RemoteAudioRole | null => {
  const storedRole = store.getRemoteTrackRole(track.id)
  if (storedRole === 'speech' || storedRole === 'music') return storedRole

  if (track.contentHint === 'speech' || track.contentHint === 'music') {
    return track.contentHint
  }

  return null
}

export function useRemoteAudioTracks(): {
  micTrack: ComputedRef<MediaStreamTrack | null>
  systemTrack: ComputedRef<MediaStreamTrack | null>
} {
  const store = useWebRtcStore()

  const audioTracks = computed(() => store.remoteStream?.getAudioTracks() ?? [])

  const classifyTrack = (track: MediaStreamTrack): RemoteAudioRole | null => {
    return resolveRemoteAudioRole(store, track)
  }

  const micTrack = computed(() => {
    const tracks = audioTracks.value
    const classifiedMic = tracks.find((track) => classifyTrack(track) === 'speech')
    if (classifiedMic) return classifiedMic

    if (tracks.length === 1) return tracks[0] ?? null

    const unclassifiedTracks = tracks.filter((track) => classifyTrack(track) === null)
    return unclassifiedTracks[0] ?? null
  })

  const systemTrack = computed(() => {
    const tracks = audioTracks.value
    const classifiedSystem = tracks.find((track) => classifyTrack(track) === 'music')
    if (classifiedSystem) return classifiedSystem

    const mic = micTrack.value
    const remainingTracks = tracks.filter((track) => track.id !== mic?.id)
    return remainingTracks[0] ?? null
  })

  return {
    micTrack,
    systemTrack
  }
}
