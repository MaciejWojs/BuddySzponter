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
    emit('video-ready', target.videoWidth, target.videoHeight)
  }
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

/* ================= SCROLL FIX (MOUSE + TOUCHPAD) ================= */

const normalizeScroll = (deltaY: number): number => {
  const isTrackpad = Math.abs(deltaY) < 40

  let value = deltaY

  if (isTrackpad) {
    value *= 0.6
  }

  if (!isTrackpad) {
    value *= -1
  }

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
