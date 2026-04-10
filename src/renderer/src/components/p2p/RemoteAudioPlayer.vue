<script setup lang="ts">
import { ref, shallowRef, watchEffect } from 'vue'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'

const webRtcStore = useWebRtcStore()

const micAudioRef = ref<HTMLAudioElement | null>(null)
const sysAudioRef = ref<HTMLAudioElement | null>(null)

const micStream = shallowRef<MediaStream | null>(null)
const sysStream = shallowRef<MediaStream | null>(null)

watchEffect(() => {
  const stream = webRtcStore.remoteStream

  if (!stream) {
    micStream.value = null
    sysStream.value = null
    return
  }

  const audioTracks = stream.getAudioTracks()
  const micTrack = audioTracks.find((t) => t.contentHint === 'speech')
  const sysTrack = audioTracks.find((t) => t.contentHint === 'music')

  micStream.value = micTrack ? new MediaStream([micTrack]) : null
  sysStream.value = sysTrack ? new MediaStream([sysTrack]) : null
})

watchEffect(() => {
  if (!micAudioRef.value) return
  micAudioRef.value.srcObject = micStream.value

  if (micStream.value) {
    micAudioRef.value.play().catch(() => {})
  }

  const vol = Math.max(0, Math.min(1, webRtcStore.remoteMicVolume))
  micAudioRef.value.volume = vol
  micAudioRef.value.muted = vol <= 0
})

watchEffect(() => {
  if (!sysAudioRef.value) return
  sysAudioRef.value.srcObject = sysStream.value

  if (sysStream.value) {
    sysAudioRef.value.play().catch(() => {})
  }

  const vol = Math.max(0, Math.min(1, webRtcStore.remoteSystemVolume))
  sysAudioRef.value.volume = vol
  sysAudioRef.value.muted = vol <= 0
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
