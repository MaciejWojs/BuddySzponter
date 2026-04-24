<script setup lang="ts">
import { onUnmounted } from 'vue'

const handleVideoReady = (width: number, height: number): void => {
  if (window.api?.app?.resizeToVideoRatio) {
    window.api.app.resizeToVideoRatio(width, height).catch(() => {})
  }
}

onUnmounted(() => {
  if (window.api?.app?.resetAspectRatio) {
    window.api.app.resetAspectRatio().catch(() => {})
  }
})
</script>

<template>
  <BuGuestVideo @video-ready="handleVideoReady" />
</template>
