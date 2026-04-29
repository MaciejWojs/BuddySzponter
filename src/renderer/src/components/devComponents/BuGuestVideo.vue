<template>
  <div
    ref="videoContainer"
    class="bg-black w-full h-full relative focus:outline-none"
    tabindex="0"
    :class="{
      'cursor-crosshair': hidChannel.isControlGranted,
      'cursor-not-allowed': !hidChannel.isControlGranted
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
      @loadedmetadata="handleMetadataLoaded"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { useHidChannel } from '@renderer/composables/channels/HidChannel'
import VideoPlayer from '../p2p/VideoPlayer.vue'

const emit = defineEmits<{
  (e: 'video-ready', width: number, height: number): void
}>()

const webRtcStore = useWebRtcStore()
const hidChannel = useHidChannel()

const videoContainer = ref<HTMLElement | null>(null)
const isMouseDown = ref(false)
const currentButton = ref<'l' | 'r' | 'm'>('l')

const focusContainer = (): void => {
  videoContainer.value?.focus()
}

const handleMetadataLoaded = (event: Event): void => {
  const target = event.target as HTMLVideoElement
  if (target && target.videoWidth && target.videoHeight) {
    // 🔥 FIX 1: USUNIĘTO NADPISYWANIE EKRANU!
    // Proporcje służą tylko do wizualnego dopasowania okna. Prawdziwy rozmiar zależy od Handshake'a!
    emit('video-ready', target.videoWidth, target.videoHeight)
  }
}

/* ================= KULOODPORNA MATEMATYKA (Bypass czarnych pasów) ================= */

const getPercentCoords = (event: MouseEvent): { x: number; y: number } => {
  if (!videoContainer.value) return { x: 0, y: 0 }

  const videoElement = videoContainer.value.querySelector('video')
  if (!videoElement || !videoElement.videoWidth) return { x: 0, y: 0 }

  const rect = videoElement.getBoundingClientRect()

  // 1. Rozdzielczość strumienia (np. 1280x720 z WebRTC)
  const vw = videoElement.videoWidth
  const vh = videoElement.videoHeight

  // 2. Fizyczne wymiary tagu <video> na Twoim ekranie
  const cw = rect.width
  const ch = rect.height

  // 3. Obliczamy idealną skalę obrazu (działa niezależnie od tego, jak duże są pasy)
  const scale = Math.min(cw / vw, ch / vh)

  // 4. Rozmiar samego "obrazka" wewnątrz diva
  const renderWidth = vw * scale
  const renderHeight = vh * scale

  // 5. Grubość czarnych pasów
  const offsetX = (cw - renderWidth) / 2
  const offsetY = (ch - renderHeight) / 2

  // 6. Czyste współrzędne myszki (bez czarnych pasów)
  const videoX = event.clientX - rect.left - offsetX
  const videoY = event.clientY - rect.top - offsetY

  // 7. Zatrzymanie kursora na krawędzi obrazu, gdy wiedziesz na czarny pas
  const clampedX = Math.max(0, Math.min(renderWidth, videoX))
  const clampedY = Math.max(0, Math.min(renderHeight, videoY))

  return {
    x: (clampedX / renderWidth) * 100,
    y: (clampedY / renderHeight) * 100
  }
}

const getButton = (event: MouseEvent): 'l' | 'r' | 'm' => {
  if (event.button === 0) return 'l'
  if (event.button === 1) return 'm'
  return 'r'
}

/* ================= MOUSE ================= */

const handleMouseMove = (event: MouseEvent): void => {
  if (!hidChannel.isControlGranted.value || !videoContainer.value) return
  const { x, y } = getPercentCoords(event)
  hidChannel.sendMouseFromVideo(x, y)
}

const handleMouseDown = (event: MouseEvent): void => {
  if (!hidChannel.isControlGranted.value) return
  isMouseDown.value = true
  currentButton.value = getButton(event)
  const { x, y } = getPercentCoords(event)
  hidChannel.sendMouseAction(currentButton.value, 'd', x, y)
}

const handleMouseUp = (event: MouseEvent): void => {
  if (!hidChannel.isControlGranted.value || !isMouseDown.value) return
  isMouseDown.value = false
  const { x, y } = getPercentCoords(event)
  hidChannel.sendMouseAction(currentButton.value, 'u', x, y)
}

/* ================= SCROLL FIX ================= */

const normalizeScroll = (deltaY: number): number => {
  const isTrackpad = Math.abs(deltaY) < 40
  let value = deltaY
  if (isTrackpad) value *= 0.6
  if (!isTrackpad) value *= -1
  return value
}

const handleWheel = (event: WheelEvent): void => {
  if (!hidChannel.isControlGranted.value) return
  event.preventDefault()
  const scroll = normalizeScroll(event.deltaY)
  hidChannel.sendMouseScroll(scroll)
}

/* ================= KEYBOARD ================= */

const handleKeyDown = (e: KeyboardEvent): void => {
  if (!hidChannel.isControlGranted.value) return
  hidChannel.sendKeyboardEvent(e.code, 'd')
}

const handleKeyUp = (e: KeyboardEvent): void => {
  if (!hidChannel.isControlGranted.value) return
  hidChannel.sendKeyboardEvent(e.code, 'u')
}

/* ================= LIFECYCLE ================= */

onMounted(() => {
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mouseup', handleMouseUp)
})
</script>
