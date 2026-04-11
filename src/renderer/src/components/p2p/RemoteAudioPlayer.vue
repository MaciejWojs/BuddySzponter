<script setup lang="ts">
import { ref, shallowRef, watch, watchEffect, onMounted, onUnmounted } from 'vue'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { useConnectionStore } from '@renderer/stores/connectionStore' // Dodany import

const webRtcStore = useWebRtcStore()
const connectionStore = useConnectionStore() // Dodany store

const micAudioRef = ref<HTMLAudioElement | null>(null)
const sysAudioRef = ref<HTMLAudioElement | null>(null)

const micStream = shallowRef<MediaStream | null>(null)
const sysStream = shallowRef<MediaStream | null>(null)

watch(
  () => [webRtcStore.remoteStream, webRtcStore.remoteMicTrackId, webRtcStore.remoteSysTrackId],
  ([stream, micId, sysId]) => {
    if (!stream) {
      micStream.value = null
      sysStream.value = null
      return
    }

    const audioTracks = (stream as MediaStream).getAudioTracks()

    let micTrack = audioTracks.find((t) => t.id === micId)
    let sysTrack = audioTracks.find((t) => t.id === sysId)

    // 🚨 DRUGA LINIA OBRONY 🚨
    // Jeśli z jakiegoś powodu ID nie zadziałało, ale jesteśmy Hostem i przyszedł 1 track -> to na 100% mikrofon Gościa.
    if (connectionStore.isHost && !micTrack && audioTracks.length === 1) {
      micTrack = audioTracks[0]
      console.warn(
        '[RemoteAudioPlayer] Fallback ID: Wymuszono przypisanie jedynej ścieżki do mikrofonu Gościa.'
      )
    }

    // Przypisanie do streamów dla Audio Node
    if (micTrack && (!micStream.value || micStream.value.getAudioTracks()[0]?.id !== micTrack.id)) {
      micStream.value = new MediaStream([micTrack])
    } else if (!micTrack) {
      micStream.value = null
    }

    if (sysTrack && (!sysStream.value || sysStream.value.getAudioTracks()[0]?.id !== sysTrack.id)) {
      sysStream.value = new MediaStream([sysTrack])
    } else if (!sysTrack) {
      sysStream.value = null
    }
  },
  { immediate: true, deep: true }
)

const attemptPlay = async (audioEl: HTMLAudioElement | null): Promise<void> => {
  if (audioEl && audioEl.paused && audioEl.srcObject) {
    try {
      await audioEl.play()
    } catch (e) {
      console.warn('Autoplay zablokowany, czekam na interakcję strony.', e)
    }
  }
}

watchEffect(() => {
  const audioEl = micAudioRef.value
  const stream = micStream.value
  const volume = webRtcStore.remoteMicVolume

  if (!audioEl) return

  if (audioEl.srcObject !== stream) {
    audioEl.srcObject = stream as MediaStream | null
    attemptPlay(audioEl)
  }

  const vol = Math.max(0, Math.min(1, volume))
  audioEl.volume = vol
  audioEl.muted = vol <= 0

  if (vol > 0) attemptPlay(audioEl)
})

watchEffect(() => {
  const audioEl = sysAudioRef.value
  const stream = sysStream.value
  const volume = webRtcStore.remoteSystemVolume

  if (!audioEl) return

  if (audioEl.srcObject !== stream) {
    audioEl.srcObject = stream as MediaStream | null
    attemptPlay(audioEl)
  }

  const vol = Math.max(0, Math.min(1, volume))
  audioEl.volume = vol
  audioEl.muted = vol <= 0

  if (vol > 0) attemptPlay(audioEl)
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
  <audio
    ref="micAudioRef"
    autoplay
    playsinline
    class="opacity-0 pointer-events-none absolute w-0 h-0"
  ></audio>
  <audio
    ref="sysAudioRef"
    autoplay
    playsinline
    class="opacity-0 pointer-events-none absolute w-0 h-0"
  ></audio>
</template>
