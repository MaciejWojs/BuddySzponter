<script setup lang="ts">
import { ref, watch } from 'vue'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { useRemoteAudioTracks } from '@renderer/composables/connection/useRemoteAudioTracks'
import { useAutoplayUnlock } from '@renderer/composables/connection/useAutoplayUnlock'

const webRtcStore = useWebRtcStore()
const { micTrack, systemTrack } = useRemoteAudioTracks()

const micAudioRef = ref<HTMLAudioElement | null>(null)
const sysAudioRef = ref<HTMLAudioElement | null>(null)

const { attemptPlay } = useAutoplayUnlock([micAudioRef, sysAudioRef])

const syncAudioElement = (
  audioEl: HTMLAudioElement | null,
  track: MediaStreamTrack | null,
  volume: number
): void => {
  if (!audioEl) return

  audioEl.srcObject = track ? new MediaStream([track]) : null

  const normalizedVolume = Math.max(0, Math.min(1, volume))
  audioEl.volume = normalizedVolume
  audioEl.muted = normalizedVolume <= 0

  if (track) {
    void attemptPlay(audioEl)
  }
}

watch(
  [micTrack, micAudioRef, () => webRtcStore.remoteMicVolume],
  ([track, audioEl, volume]) => {
    syncAudioElement(audioEl, track, volume)
  },
  { immediate: true }
)

watch(
  [systemTrack, sysAudioRef, () => webRtcStore.remoteSystemVolume],
  ([track, audioEl, volume]) => {
    syncAudioElement(audioEl, track, volume)
  },
  { immediate: true }
)
</script>

<template>
  <div class="hidden" aria-hidden="true">
    <audio ref="micAudioRef" autoplay playsinline></audio>
    <audio ref="sysAudioRef" autoplay playsinline></audio>
  </div>
</template>
