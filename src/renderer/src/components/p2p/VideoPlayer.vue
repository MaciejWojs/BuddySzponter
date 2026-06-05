<script setup lang="ts">
import { ref, watchEffect } from 'vue'

const props = withDefaults(
  defineProps<{
    stream: MediaStream | null
    placeholderText?: string
    /** true = brak odsłuchu z elementu video (np. podgląd lokalnego strumienia). Gość: false, żeby słyszeć hosta. */
    mutedPlayback?: boolean
  }>(),
  {
    placeholderText: 'Brak strumienia.',
    mutedPlayback: false
  }
)

const videoRef = ref<HTMLVideoElement | null>(null)

watchEffect(() => {
  const el = videoRef.value
  if (!el) return
  el.muted = props.mutedPlayback
  el.srcObject = props.stream
  void el.play().catch(() => {})
})
</script>

<template>
  <div
    class="bg-black border border-[#444] rounded-lg overflow-hidden aspect-video relative flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)]"
  >
    <div v-if="!stream" class="flex flex-col items-center gap-3 text-gray-500 z-10 p-5 text-center">
      <svg
        class="w-12 h-12 opacity-30 animate-pulse"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
      <p class="text-xs font-mono m-0">{{ placeholderText }}</p>
    </div>

    <video
      v-show="stream"
      ref="videoRef"
      autoplay
      playsinline
      :muted="mutedPlayback"
      class="w-full h-full object-contain absolute inset-0 transition-opacity duration-500"
      :class="stream ? 'opacity-100' : 'opacity-0'"
      @loadedmetadata="$emit('loadedmetadata', $event)"
    ></video>
  </div>
</template>
