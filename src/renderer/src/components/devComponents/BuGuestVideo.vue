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
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
      @contextmenu.prevent
      @keydown.prevent="handleKeyDown"
      @keyup.prevent="handleKeyUp"
      @wheel.passive="false"
      @wheel="handleWheel"
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import VideoPlayer from '../p2p/VideoPlayer.vue'

const webRtcStore = useWebRtcStore()

const videoContainer = ref<HTMLElement | null>(null)
const isMouseDown = ref(false)
const currentButton = ref<'l' | 'r' | 'm'>('l')

const focusContainer = (): void => {
  videoContainer.value?.focus()
}

/* ================= MOUSE ================= */

const getPercentCoords = (event: MouseEvent): { x: number; y: number } => {
  const rect = videoContainer.value!.getBoundingClientRect()

  const percentX = ((event.clientX - rect.left) / rect.width) * 100
  const percentY = ((event.clientY - rect.top) / rect.height) * 100

  return {
    x: Math.max(0, Math.min(100, percentX)),
    y: Math.max(0, Math.min(100, percentY))
  }
}

const getButton = (event: MouseEvent): 'l' | 'r' | 'm' => {
  if (event.button === 0) return 'l'
  if (event.button === 1) return 'm'
  return 'r'
}

const handleMouseMove = (event: MouseEvent): void => {
  if (!webRtcStore.isGuestControlAllowed || !videoContainer.value) return

  event.preventDefault()

  const { x, y } = getPercentCoords(event)
  webRtcStore.sendMousePosition(x, y)
}

const handleMouseDown = (event: MouseEvent): void => {
  if (!webRtcStore.isGuestControlAllowed || !videoContainer.value) return

  event.preventDefault()

  isMouseDown.value = true
  currentButton.value = getButton(event)

  const { x, y } = getPercentCoords(event)

  webRtcStore.sendMouseAction(currentButton.value, 'd', x, y)
}

const handleMouseUp = (event: MouseEvent): void => {
  if (!webRtcStore.isGuestControlAllowed || !videoContainer.value) return
  if (!isMouseDown.value) return

  event.preventDefault()

  isMouseDown.value = false

  const { x, y } = getPercentCoords(event)

  webRtcStore.sendMouseAction(currentButton.value, 'u', x, y)
}

/* ================= SCROLL (WHEEL) ================= */

const handleWheel = (event: WheelEvent): void => {
  if (!webRtcStore.isGuestControlAllowed || !videoContainer.value) return
  event.preventDefault()
  webRtcStore.sendMouseScroll(event.deltaY)
}

/* ================= KEYBOARD ================= */

const handleKeyDown = (e: KeyboardEvent): void => {
  if (!webRtcStore.isGuestControlAllowed) return
  webRtcStore.sendKeyboardEvent(e.code, 'd')
}

const handleKeyUp = (e: KeyboardEvent): void => {
  if (!webRtcStore.isGuestControlAllowed) return
  webRtcStore.sendKeyboardEvent(e.code, 'u')
}

/* ================= GLOBAL LISTENERS ================= */

onMounted(() => {
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mouseup', handleMouseUp)
})
</script>
