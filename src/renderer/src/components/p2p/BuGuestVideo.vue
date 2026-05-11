<template>
  <div
    ref="videoContainer"
    class="bg-black w-full h-full relative focus:outline-none"
    tabindex="0"
    :class="{ 'cursor-not-allowed': !hidChannel.isControlGranted.value }"
    :style="cursorStyle"
    @mouseenter="focusContainer"
    @mousemove="handleMouseMove"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @contextmenu.prevent
    @blur="handleVideoBlur"
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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

const cursorStyle = computed(() => {
  if (!hidChannel.isControlGranted.value) return {}
  const cursor = hidChannel.remoteHostCursorType.value || 'default'
  return { cursor }
})

const focusContainer = (): void => {
  videoContainer.value?.focus()
}

let videoCheckInterval: ReturnType<typeof setInterval> | null = null
const lastVw = ref(0)
const lastVh = ref(0)

const checkVideoDimensions = (): void => {
  if (!videoContainer.value) return
  const videoEl = videoContainer.value.querySelector('video')
  if (!videoEl) return

  const vw = videoEl.videoWidth
  const vh = videoEl.videoHeight

  if (vw > 0 && vh > 0 && (vw !== lastVw.value || vh !== lastVh.value)) {
    lastVw.value = vw
    lastVh.value = vh
    emit('video-ready', vw, vh)
  }
}

const handleMetadataLoaded = (): void => {
  checkVideoDimensions()
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

  const cw = rect.width
  const ch = rect.height
  if (cw === 0 || ch === 0) return { x: 0, y: 0 }

  const scale = Math.min(cw / vw, ch / vh)

  const renderWidth = vw * scale
  const renderHeight = vh * scale

  const offsetX = (cw - renderWidth) / 2
  const offsetY = (ch - renderHeight) / 2

  const videoX = event.clientX - rect.left - offsetX
  const videoY = event.clientY - rect.top - offsetY

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
  return isTrackpad ? deltaY * -0.6 : deltaY * -1
}

const handleWheel = (event: WheelEvent): void => {
  if (!hidChannel.isControlGranted.value) return
  event.preventDefault()
  const scroll = normalizeScroll(event.deltaY)
  hidChannel.sendMouseScroll(scroll)
}

/* ================= KEYBOARD ================= */

/** Klawisze, dla których wysłano „down” do hosta — bez keyup przy utracie fokusu zostają „wciśnięte” na hoście. */
const keysHeldDownRemote = new Set<string>()

const releaseAllHeldKeysRemote = (): void => {
  if (keysHeldDownRemote.size === 0) return
  const codes = Array.from(keysHeldDownRemote)
  keysHeldDownRemote.clear()
  for (const code of codes) {
    hidChannel.sendKeyboardKeyUpRemote(code)
  }
}

const isDomModifierCode = (code: string): boolean =>
  code === 'AltRight' ||
  code === 'AltLeft' ||
  code === 'ControlLeft' ||
  code === 'ControlRight' ||
  code === 'ShiftLeft' ||
  code === 'ShiftRight' ||
  code === 'MetaLeft' ||
  code === 'MetaRight' ||
  code === 'OSLeft' ||
  code === 'OSRight'

const handleKeyDown = (e: KeyboardEvent): void => {
  if (!hidChannel.isControlGranted.value) return
  if (e.repeat && !isDomModifierCode(e.code)) return
  keysHeldDownRemote.add(e.code)
  hidChannel.sendKeyboardEvent(e.code, 'd')
}

const handleKeyUp = (e: KeyboardEvent): void => {
  if (!hidChannel.isControlGranted.value) return
  keysHeldDownRemote.delete(e.code)
  hidChannel.sendKeyboardEvent(e.code, 'u')
}

const handleVideoBlur = (): void => {
  releaseAllHeldKeysRemote()
}

const handleWindowBlur = (): void => {
  releaseAllHeldKeysRemote()
}

const handleVisibilityChange = (): void => {
  if (document.visibilityState === 'hidden') {
    releaseAllHeldKeysRemote()
  }
}

watch(
  () => hidChannel.isControlGranted.value,
  (granted, wasGranted) => {
    if (wasGranted && !granted) {
      releaseAllHeldKeysRemote()
    }
  }
)

/* ================= LIFECYCLE ================= */

onMounted(() => {
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('blur', handleWindowBlur)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  videoCheckInterval = setInterval(checkVideoDimensions, 500)
})

onUnmounted(() => {
  releaseAllHeldKeysRemote()
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('blur', handleWindowBlur)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (videoCheckInterval) clearInterval(videoCheckInterval)
})
</script>
