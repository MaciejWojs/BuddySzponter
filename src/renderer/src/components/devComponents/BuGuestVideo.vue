<template>
  <div
    class="bg-[#1e1e1e] border border-[#333] rounded-xl p-5 shadow-2xl relative flex flex-col gap-4"
  >
    <header class="flex justify-between items-center">
      <h2 class="text-xl font-bold m-0 text-white flex items-center gap-2">Zdalny Ekran Hosta</h2>

      <div class="flex items-center gap-3">
        <div
          v-if="webRtcStore.rtcStatus === 'connected'"
          class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors duration-300 border"
          :class="
            webRtcStore.isGuestControlAllowed
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          "
        >
          <span v-if="webRtcStore.isGuestControlAllowed">✅ Kontrola Aktywna</span>
          <span v-else>🔒 Tylko podgląd</span>
        </div>

        <div
          class="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-[#444]"
        >
          <span
            class="w-2.5 h-2.5 rounded-full shadow-inner transition-colors duration-300"
            :class="{
              'bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse':
                webRtcStore.rtcStatus === 'connected',
              'bg-gray-600': webRtcStore.rtcStatus === 'disconnected',
              'bg-blue-500 shadow-[0_0_8px_#3b82f6] animate-pulse':
                webRtcStore.rtcStatus === 'connecting'
            }"
          ></span>
          <span class="text-[10px] font-mono text-gray-300 uppercase tracking-widest">
            {{
              webRtcStore.rtcStatus === 'connected'
                ? 'POŁĄCZONO'
                : webRtcStore.rtcStatus.toUpperCase()
            }}
          </span>
        </div>
      </div>
    </header>

    <div
      ref="videoContainer"
      class="bg-black border border-[#444] rounded-lg overflow-hidden aspect-video relative block w-full shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all"
      :class="{
        'cursor-crosshair': webRtcStore.isGuestControlAllowed,
        'cursor-not-allowed':
          !webRtcStore.isGuestControlAllowed && webRtcStore.rtcStatus === 'connected'
      }"
      tabindex="0"
      @mouseenter="focusContainer"
      @mousemove="handleMouseMove"
      @click="handleMouseAction($event, 'click')"
      @contextmenu.prevent="handleMouseAction($event, 'click')"
      @dblclick="handleMouseAction($event, 'double')"
      @keydown.prevent="handleKeyDown"
      @keyup.prevent="handleKeyUp"
    >
      <VideoPlayer
        class="absolute inset-0 w-full h-full object-contain pointer-events-none"
        :stream="webRtcStore.remoteStream"
        :placeholder-text="
          webRtcStore.rtcStatus === 'connected'
            ? 'Czekam na obraz od hosta...'
            : 'Połącz się, aby zobaczyć ekran.'
        "
      />
    </div>

    <transition name="fade">
      <div
        v-if="webRtcStore.rtcStatus === 'connected'"
        class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#161616] border border-[#2a2a2a] rounded-lg p-4 mt-2"
      >
        <div class="flex flex-col gap-2">
          <div
            class="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wide"
          >
            <span class="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" class="w-4 h-4 text-blue-400">
                <path
                  fill="currentColor"
                  d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
                />
              </svg>
              Dźwięk Systemu
            </span>
            <span class="text-blue-400"
              >{{ Math.round(webRtcStore.remoteSystemVolume * 100) }}%</span
            >
          </div>
          <input
            v-model.number="webRtcStore.remoteSystemVolume"
            type="range"
            min="0"
            max="2"
            step="0.05"
            class="custom-slider blue-slider"
          />
        </div>

        <div class="flex flex-col gap-2">
          <div
            class="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wide"
          >
            <span class="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" class="w-4 h-4 text-emerald-400">
                <path
                  fill="currentColor"
                  d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"
                />
              </svg>
              Mikrofon Hosta
            </span>
            <span class="text-emerald-400"
              >{{ Math.round(webRtcStore.remoteMicVolume * 100) }}%</span
            >
          </div>
          <input
            v-model.number="webRtcStore.remoteMicVolume"
            type="range"
            min="0"
            max="2"
            step="0.05"
            class="custom-slider emerald-slider"
          />
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import VideoPlayer from '../p2p/VideoPlayer.vue'

const webRtcStore = useWebRtcStore()
const videoContainer = ref<HTMLElement | null>(null)

const focusContainer = (): void => {
  videoContainer.value?.focus()
}

// --- OBSŁUGA RUCHU MYSZY ---
const handleMouseMove = (event: MouseEvent): void => {
  if (!webRtcStore.isGuestControlAllowed) return
  if (!videoContainer.value) return
  const rect = videoContainer.value.getBoundingClientRect()
  const percentX = ((event.clientX - rect.left) / rect.width) * 100
  const percentY = ((event.clientY - rect.top) / rect.height) * 100
  const clampedX = Math.max(0, Math.min(100, percentX))
  const clampedY = Math.max(0, Math.min(100, percentY))
  webRtcStore.sendMousePosition(clampedX, clampedY)
}

const handleMouseAction = (event: MouseEvent, action: 'click' | 'double'): void => {
  if (!webRtcStore.isGuestControlAllowed || !videoContainer.value) return

  const rect = videoContainer.value.getBoundingClientRect()
  const percentX = ((event.clientX - rect.left) / rect.width) * 100
  const percentY = ((event.clientY - rect.top) / rect.height) * 100

  const clampedX = Math.max(0, Math.min(100, percentX))
  const clampedY = Math.max(0, Math.min(100, percentY))

  // Rozpoznawanie przycisku (0: lewy, 1: środkowy, 2: prawy)
  const button = event.button === 0 ? 'left' : event.button === 2 ? 'right' : 'middle'

  webRtcStore.sendMouseAction(button, action, clampedX, clampedY)
}

// --- OBSŁUGA KLAWIATURY ---
const handleKeyDown = (e: KeyboardEvent): void => {
  if (!webRtcStore.isGuestControlAllowed) return
  webRtcStore.sendKeyboardEvent(e.code, 'down')
}

const handleKeyUp = (e: KeyboardEvent): void => {
  if (!webRtcStore.isGuestControlAllowed) return
  webRtcStore.sendKeyboardEvent(e.code, 'up')
}
</script>

<style scoped>
/* Płynne pojawianie się panelu audio */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* =========================================
   WŁASNE SUWAKI (CUSTOM RANGE SLIDERS)
   ========================================= */
.custom-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  background: #2a2a2a;
  border-radius: 4px;
  outline: none;
  transition: background 0.3s;
}

.custom-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  cursor: pointer;
  transition:
    transform 0.15s ease-in-out,
    box-shadow 0.15s ease;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.custom-slider:active::-webkit-slider-thumb {
  transform: scale(1.2);
}

/* Kolorystyka suwaków */
.emerald-slider::-webkit-slider-thumb {
  background: #10b981;
}
.emerald-slider:hover::-webkit-slider-thumb {
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
}

.blue-slider::-webkit-slider-thumb {
  background: #3b82f6;
}
.blue-slider:hover::-webkit-slider-thumb {
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.6);
}
</style>
