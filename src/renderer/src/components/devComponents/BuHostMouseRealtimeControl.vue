<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useConnectionStore } from '@renderer/stores/connectionStore'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'

const connectionStore = useConnectionStore()
const webRtcStore = useWebRtcStore()

const isTracking = ref(false)
const lastSent = ref<{ x: number; y: number } | null>(null)
const lastPreview = ref<{ x: number; y: number }>({ x: 0, y: 0 })

let rafId: number | null = null
let pendingEvent: MouseEvent | null = null

const canTrack = computed(() => connectionStore.isHost && webRtcStore.rtcStatus === 'connected')

const clampPercent = (value: number): number => Math.min(100, Math.max(0, value))

const eventToPercent = (event: MouseEvent): { x: number; y: number } => {
  const width = window.screen.width || 1
  const height = window.screen.height || 1

  return {
    x: clampPercent(Math.round((event.screenX / width) * 100)),
    y: clampPercent(Math.round((event.screenY / height) * 100))
  }
}

const flushPendingMouseEvent = (): void => {
  rafId = null

  if (!pendingEvent || !isTracking.value || !canTrack.value) return

  const nextPosition = eventToPercent(pendingEvent)
  pendingEvent = null

  lastPreview.value = nextPosition

  if (
    lastSent.value &&
    lastSent.value.x === nextPosition.x &&
    lastSent.value.y === nextPosition.y
  ) {
    return
  }

  lastSent.value = nextPosition
  webRtcStore.sendMousePosition(nextPosition.x, nextPosition.y)
}

const handleMouseMove = (event: MouseEvent): void => {
  if (!isTracking.value || !canTrack.value) return

  pendingEvent = event

  if (rafId === null) {
    rafId = window.requestAnimationFrame(flushPendingMouseEvent)
  }
}

const stopTracking = (): void => {
  if (!isTracking.value) return

  isTracking.value = false
  pendingEvent = null

  if (rafId !== null) {
    window.cancelAnimationFrame(rafId)
    rafId = null
  }

  window.removeEventListener('mousemove', handleMouseMove)
}

const startTracking = (): void => {
  if (!canTrack.value || isTracking.value) return

  isTracking.value = true
  window.addEventListener('mousemove', handleMouseMove)
}

const toggleTracking = (): void => {
  if (isTracking.value) {
    stopTracking()
    return
  }

  startTracking()
}

onUnmounted(() => {
  stopTracking()
})
</script>

<template>
  <section class="mt-6 border-t border-[#333] pt-4">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <h3 class="text-xs font-bold uppercase tracking-widest text-cyan-300">
        Realtime Host Mouse Stream
      </h3>
      <span
        class="text-[10px] uppercase tracking-wider"
        :class="canTrack ? 'text-cyan-400' : 'text-gray-500'"
      >
        {{ canTrack ? 'HOST + P2P CONNECTED' : 'Wymaga roli host i aktywnego P2P' }}
      </span>
    </div>

    <div class="rounded-lg border border-[#3a3a3a] bg-black/20 p-3">
      <p class="text-[11px] text-gray-400 mb-3">
        Nasłuch ruchu kursora hosta w oknie aplikacji i wysyłka współrzędnych do gościa przez
        hid-control.
      </p>

      <div class="flex flex-wrap items-center gap-3">
        <button
          class="px-4 py-2 rounded text-xs font-bold transition-colors border"
          :class="
            isTracking
              ? 'bg-rose-600/20 text-rose-400 border-rose-500/50 hover:bg-rose-600/30'
              : 'bg-cyan-600/20 text-cyan-300 border-cyan-500/50 hover:bg-cyan-600/30'
          "
          :disabled="!canTrack"
          @click="toggleTracking"
        >
          {{ isTracking ? 'Stop stream' : 'Start stream' }}
        </button>

        <span class="text-[11px] font-mono text-gray-300">
          last sent: X {{ lastPreview.x }} | Y {{ lastPreview.y }}
        </span>
      </div>
    </div>
  </section>
</template>
