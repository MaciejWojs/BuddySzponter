<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useHidChannel } from '@renderer/composables/channels/HidChannel'

const props = defineProps<{
  stream: MediaStream | null
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const { sendMouseFromVideo } = useHidChannel()

watchEffect(() => {
  if (!videoRef.value) return
  videoRef.value.srcObject = props.stream
})

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value))
}

const handleMouseMove = (event: MouseEvent): void => {
  const videoEl = videoRef.value
  if (!videoEl || !props.stream) return

  const rect = videoEl.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  const relativeX = clamp(event.clientX - rect.left, 0, rect.width)
  const relativeY = clamp(event.clientY - rect.top, 0, rect.height)

  const percentX = relativeX / rect.width
  const percentY = relativeY / rect.height

  sendMouseFromVideo(percentX, percentY)
}
</script>

<template>
  <video
    ref="videoRef"
    autoplay
    playsinline
    class="guest-video-player"
    @mousemove="handleMouseMove"
  ></video>
</template>

<style scoped>
.guest-video-player {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
