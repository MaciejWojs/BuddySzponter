<script setup lang="ts">
import { ref, shallowRef, watchEffect, onMounted, onUnmounted } from 'vue'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { useConnectionStore } from '@renderer/stores/connectionStore'

const webRtcStore = useWebRtcStore()
const connectionStore = useConnectionStore()

const micAudioRef = ref<HTMLAudioElement | null>(null)
const sysAudioRef = ref<HTMLAudioElement | null>(null)

const micStream = shallowRef<MediaStream | null>(null)
const sysStream = shallowRef<MediaStream | null>(null)

const attemptPlay = async (audioEl: HTMLAudioElement | null): Promise<void> => {
  if (audioEl && audioEl.paused && audioEl.srcObject) {
    try {
      await audioEl.play()
    } catch (e) {
      console.warn('[RemoteAudioPlayer] Autoplay zablokowany, czekam na interakcję.', e)
    }
  }
}

watchEffect(() => {
  const stream = webRtcStore.remoteStream

  if (!stream) {
    micStream.value = null
    sysStream.value = null
    if (micAudioRef.value) micAudioRef.value.srcObject = null
    if (sysAudioRef.value) sysAudioRef.value.srcObject = null
    return
  }

  const audioTracks = stream.getAudioTracks()

  // Odtwarzacz czyta role nadane przez warstwę WebRTC.
  const micTrack =
    audioTracks.find((track) => webRtcStore.getRemoteTrackRole(track.id) === 'speech') ??
    audioTracks.find((track) => track.contentHint === 'speech') ??
    (connectionStore.isHost && audioTracks.length === 1 ? audioTracks[0] : null)

  const sysTrack =
    audioTracks.find((track) => webRtcStore.getRemoteTrackRole(track.id) === 'music') ??
    audioTracks.find((track) => track.contentHint === 'music') ??
    null

  if (micTrack) {
    if (!micStream.value || micStream.value.getAudioTracks()[0]?.id !== micTrack.id) {
      micStream.value = new MediaStream([micTrack])
    }
  } else {
    micStream.value = null
  }

  if (sysTrack) {
    if (!sysStream.value || sysStream.value.getAudioTracks()[0]?.id !== sysTrack.id) {
      sysStream.value = new MediaStream([sysTrack])
    }
  } else {
    sysStream.value = null
  }

  if (micAudioRef.value) {
    micAudioRef.value.srcObject = micStream.value
    micAudioRef.value.volume = Math.max(0, Math.min(1, webRtcStore.remoteMicVolume))
    micAudioRef.value.muted = micAudioRef.value.volume <= 0
    if (micStream.value) attemptPlay(micAudioRef.value)
  }

  if (sysAudioRef.value) {
    sysAudioRef.value.srcObject = sysStream.value
    sysAudioRef.value.volume = Math.max(0, Math.min(1, webRtcStore.remoteSystemVolume))
    sysAudioRef.value.muted = sysAudioRef.value.volume <= 0
    if (sysStream.value) attemptPlay(sysAudioRef.value)
  }
})

const handleInteraction = (): void => {
  attemptPlay(micAudioRef.value)
  attemptPlay(sysAudioRef.value)
}

onMounted(() => {
  document.addEventListener('click', handleInteraction, { once: true })
})

onUnmounted(() => {
  document.removeEventListener('click', handleInteraction)
})
</script>

<template>
  <div class="hidden" aria-hidden="true">
    <audio ref="micAudioRef" autoplay playsinline></audio>
    <audio ref="sysAudioRef" autoplay playsinline></audio>
  </div>
</template>
