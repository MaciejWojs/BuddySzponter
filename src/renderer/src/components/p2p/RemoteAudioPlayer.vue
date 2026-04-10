<script setup lang="ts">
import { ref, watchEffect } from 'vue'

const props = defineProps<{
  stream: MediaStream | null
  volume: number
}>()

const audioRef = ref<HTMLAudioElement | null>(null)

watchEffect(() => {
  if (!audioRef.value) return

  audioRef.value.srcObject = props.stream

  const vol = Math.max(0, Math.min(1, props.volume))
  audioRef.value.volume = vol
  audioRef.value.muted = vol <= 0
})
</script>

<template>
  <audio
    ref="audioRef"
    autoplay
    playsinline
    class="opacity-0 pointer-events-none absolute w-0 h-0"
  ></audio>
</template>
