<template>
  <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5 shadow-xl relative overflow-hidden">
    <header class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold m-0 text-white">Zdalny Ekran Hosta</h2>

      <div class="flex items-center gap-2">
        <span
          class="w-3 h-3 rounded-full shadow-inner transition-colors duration-300"
          :class="{
            'bg-emerald-500 shadow-emerald-700 animate-pulse':
              webRtcStore.rtcStatus === 'connected',
            'bg-gray-600 shadow-gray-800': webRtcStore.rtcStatus === 'disconnected',
            'bg-blue-600 shadow-blue-800 animate-pulse': webRtcStore.rtcStatus === 'connecting'
          }"
        ></span>
        <span class="text-xs font-mono text-gray-400 uppercase tracking-widest">
          {{
            webRtcStore.rtcStatus === 'connected'
              ? 'POŁĄCZONO'
              : webRtcStore.rtcStatus.toUpperCase()
          }}
        </span>
      </div>
    </header>

    <div
      class="bg-black border border-[#444] rounded-lg overflow-hidden aspect-video relative flex items-center justify-center"
    >
      <video
        ref="remoteVideoRef"
        autoplay
        playsinline
        class="w-full h-full object-contain absolute inset-0 transition-opacity duration-500"
        :class="webRtcStore.remoteStream ? 'opacity-100' : 'opacity-0'"
      ></video>

      <div
        v-if="!webRtcStore.remoteStream"
        class="flex flex-col items-center gap-3 text-gray-500 z-10 p-5 text-center"
      >
        <svg class="w-16 h-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <p class="text-sm font-mono m-0">
          {{
            webRtcStore.rtcStatus === 'connected'
              ? 'Czekam na obraz od hosta...'
              : 'Połącz się, aby zobaczyć ekran.'
          }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useWebRtcStore } from '@renderer/stores/useWebRtcStore'

const webRtcStore = useWebRtcStore()

// Referencja do fizycznego tagu HTML <video>
const remoteVideoRef = ref<HTMLVideoElement | null>(null)

// Kiedy Store otrzyma stream od partnera, wstrzykujemy go do odtwarzacza
watch(
  () => webRtcStore.remoteStream,
  (stream) => {
    if (remoteVideoRef.value && stream) {
      console.log('[GuestVideo] Wstrzykiwanie zdalnego strumienia do tagu video.')
      // Po prostu przypisujemy MediaStream do srcObject
      remoteVideoRef.value.srcObject = stream

      // Na wszelki wypadek, chociaż autoplay powinno zadziałać
      // remoteVideoRef.value.onloadedmetadata = () => remoteVideoRef.value!.play()
    } else if (remoteVideoRef.value && !stream) {
      console.log('[GuestVideo] Czyszczenie strumienia wideo.')
      remoteVideoRef.value.srcObject = null
    }
  },
  { immediate: true }
)
</script>
