<template>
  <main
    class="w-[300px] h-[60px] box-border p-2 rounded-[14px] border border-white/10 bg-[#1e1e1e]/90 backdrop-blur-md shadow-2xl flex items-center justify-between text-[#e8e8e8] select-none"
    style="-webkit-app-region: drag"
  >
    <div
      ref="videoContainer"
      class="relative w-[76px] h-[44px] bg-black rounded-lg overflow-hidden border border-white/10 shrink-0 flex items-center justify-center"
      style="-webkit-app-region: no-drag"
      :class="webRtcStore.isGuestControlAllowed ? 'cursor-crosshair' : 'cursor-default'"
      title="Zdalny Ekran Hosta"
      @mousemove="handleMouseMove"
    >
      <VideoPlayer
        class="absolute inset-0 w-full h-full object-contain pointer-events-none"
        :stream="webRtcStore.remoteStream"
      />
      <div
        v-if="webRtcStore.rtcStatus !== 'connected'"
        class="absolute inset-0 flex items-center justify-center bg-black/80"
      >
        <span class="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Brak</span>
      </div>
    </div>

    <div class="flex items-center gap-2" style="-webkit-app-region: no-drag">
      <button
        class="tool-btn w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
        :class="
          isControlGranted
            ? 'control-active bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'control-inactive bg-rose-500/10 border-rose-500/30 text-rose-400'
        "
        type="button"
        :title="isControlGranted ? 'Zabierz kontrolę' : 'Oddaj kontrolę'"
        @click="toggleControl"
      >
        <svg v-if="!isControlGranted" viewBox="0 0 24 24" class="icon w-4 h-4">
          <path
            fill="currentColor"
            d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
          />
        </svg>
        <svg v-else viewBox="0 0 24 24" class="icon w-4 h-4">
          <path
            fill="currentColor"
            d="M13 1.07V9h7c0-4.08-3.05-7.44-7-7.93zM4 15c0 4.42 3.58 8 8 8s8-3.58 8-8v-4H4v4zm7-13.93C7.05 1.56 4 4.92 4 9h7V1.07z"
          />
        </svg>
      </button>

      <button
        class="w-8 h-8 rounded-lg flex items-center justify-center transition-all border"
        :class="
          webRtcStore.remoteSystemVolume > 0
            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
            : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
        "
        :title="webRtcStore.remoteSystemVolume > 0 ? 'Wycisz system Hosta' : 'Odcisz system Hosta'"
        @click="toggleSystemAudio"
      >
        <svg viewBox="0 0 24 24" class="w-4 h-4">
          <path
            fill="currentColor"
            d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25-2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
          />
        </svg>
      </button>

      <button
        class="w-8 h-8 rounded-lg flex items-center justify-center transition-all border"
        :class="
          webRtcStore.remoteMicVolume > 0
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
            : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
        "
        :title="webRtcStore.remoteMicVolume > 0 ? 'Wycisz mikrofon Hosta' : 'Odcisz mikrofon Hosta'"
        @click="toggleMicAudio"
      >
        <svg viewBox="0 0 24 24" class="w-4 h-4">
          <path
            fill="currentColor"
            d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"
          />
        </svg>
      </button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import VideoPlayer from '../p2p/VideoPlayer.vue'

const webRtcStore = useWebRtcStore()
const videoContainer = ref<HTMLElement | null>(null)

// --- LOKALNY STAN KONTROLI ---
const isControlGranted = ref<boolean>(false)

// --- TOGGLE CONTROL przez IPC ---
const toggleControl = async (): Promise<void> => {
  isControlGranted.value = !isControlGranted.value

  // FIX: Używamy standardowego ipcRenderer z mostu Electrona (electronAPI)
  try {
    await window.electron.ipcRenderer.invoke('widget:toggle-control', {
      granted: isControlGranted.value
    })
  } catch (error) {
    console.error('Błąd IPC widget:toggle-control:', error)
  }
}

// --- TOGGLE FUNKCJE ---
const toggleSystemAudio = (): void => {
  webRtcStore.remoteSystemVolume = webRtcStore.remoteSystemVolume > 0 ? 0 : 1
}

const toggleMicAudio = (): void => {
  webRtcStore.remoteMicVolume = webRtcStore.remoteMicVolume > 0 ? 0 : 1
}

// --- OBSŁUGA RUCHU MYSZY ---
const handleMouseMove = (event: MouseEvent): void => {
  if (!webRtcStore.isGuestControlAllowed || !videoContainer.value) return

  const rect = videoContainer.value.getBoundingClientRect()
  const percentX = ((event.clientX - rect.left) / rect.width) * 100
  const percentY = ((event.clientY - rect.top) / rect.height) * 100

  const clampedX = Math.max(0, Math.min(100, percentX))
  const clampedY = Math.max(0, Math.min(100, percentY))

  webRtcStore.sendMousePosition(clampedX, clampedY)
}
</script>

<style scoped>
button:active {
  transform: scale(0.95);
}
</style>
