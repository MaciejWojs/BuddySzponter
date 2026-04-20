<template>
  <div
    class="bg-[#1e1e1e] border border-[#333] rounded-xl p-5 shadow-2xl relative flex flex-col gap-4"
  >
    <header class="flex justify-between items-center">
      <h2 class="text-xl font-bold m-0 text-white flex items-center gap-2">Zdalny Ekran Hosta</h2>

      <div class="flex items-center gap-3">
        <div
          v-if="webRtcStore.rtcStatus === 'connected'"
          class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border"
          :class="
            webRtcStore.isGuestControlAllowed
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          "
        >
          <span v-if="webRtcStore.isGuestControlAllowed">✅ Kontrola Aktywna</span>
          <span v-else>🔒 Tylko podgląd</span>
        </div>
      </div>
    </header>

    <!-- VIDEO -->
    <div
      ref="videoContainer"
      class="bg-black border border-[#444] overflow-hidden aspect-video relative w-full"
      tabindex="0"
      :class="{
        'cursor-crosshair': webRtcStore.isGuestControlAllowed,
        'cursor-not-allowed': !webRtcStore.isGuestControlAllowed
      }"
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
        class="absolute inset-0 w-full h-full pointer-events-none"
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

/* ================= HELPERS ================= */

const getPercentCoords = (event: MouseEvent): { x: number; y: number } => {
  const rect = videoContainer.value!.getBoundingClientRect()

  const x = ((event.clientX - rect.left) / rect.width) * 100
  const y = ((event.clientY - rect.top) / rect.height) * 100

  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y))
  }
}

const getButton = (event: MouseEvent): 'l' | 'r' | 'm' => {
  if (event.button === 0) return 'l'
  if (event.button === 1) return 'm'
  return 'r'
}

/* ================= MOUSE ================= */

const handleMouseMove = (event: MouseEvent): void => {
  if (!webRtcStore.isGuestControlAllowed || !videoContainer.value) return

  const { x, y } = getPercentCoords(event)
  webRtcStore.sendMousePosition(x, y)
}

const handleMouseDown = (event: MouseEvent): void => {
  if (!webRtcStore.isGuestControlAllowed) return

  isMouseDown.value = true
  currentButton.value = getButton(event)

  const { x, y } = getPercentCoords(event)

  webRtcStore.sendMouseAction(currentButton.value, 'd', x, y)
}

const handleMouseUp = (event: MouseEvent): void => {
  if (!webRtcStore.isGuestControlAllowed || !isMouseDown.value) return

  isMouseDown.value = false

  const { x, y } = getPercentCoords(event)

  webRtcStore.sendMouseAction(currentButton.value, 'u', x, y)
}

/* ================= SCROLL FIX (MOUSE + TOUCHPAD) ================= */

const normalizeScroll = (deltaY: number): number => {
  const isTrackpad = Math.abs(deltaY) < 40

  let value = deltaY

  // touchpad: miękki scroll
  if (isTrackpad) {
    value *= 0.6
  }

  // myszka: często naturalnie odwrotny kierunek
  if (!isTrackpad) {
    value *= -1
  }

  return value
}

const handleWheel = (event: WheelEvent): void => {
  if (!webRtcStore.isGuestControlAllowed) return

  event.preventDefault()

  const scroll = normalizeScroll(event.deltaY)

  webRtcStore.sendMouseScroll(scroll)
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

/* ================= LIFECYCLE ================= */

onMounted(() => {
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mouseup', handleMouseUp)
})
</script>
