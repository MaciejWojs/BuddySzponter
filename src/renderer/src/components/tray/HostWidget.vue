<template>
  <main
    class="w-[300px] h-[60px] box-border p-2 rounded-[14px] border bg-[#1e1e1e]/90 backdrop-blur-md shadow-2xl flex items-center justify-between text-[#e8e8e8] select-none"
    :class="{ 'border-red-500 border-2': isGuestLockedOut }"
    style="-webkit-app-region: drag"
  >
    <div
      ref="videoContainer"
      class="relative w-[76px] h-[44px] bg-black rounded-lg overflow-hidden border border-white/10 shrink-0 flex items-center justify-center"
      style="-webkit-app-region: no-drag"
      :class="hidChannel.isControlGranted ? 'cursor-crosshair' : 'cursor-default'"
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
        <span class="text-[8px] text-gray-400 font-bold uppercase tracking-widest"> Brak </span>
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
        <svg v-if="!isControlGranted" viewBox="0 0 24 24" class="w-4 h-4">
          <path
            fill="currentColor"
            d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
          />
        </svg>
        <svg v-else viewBox="0 0 24 24" class="w-4 h-4">
          <path
            fill="currentColor"
            d="M13 1.07V9h7c0-4.08-3.05-7.44-7-7.93zM4 15c0 4.42 3.58 8 8 8s8-3.58 8-8v-4H4v4zm7-13.93C7.05 1.56 4 4.92 4 9h7V1.07z"
          />
        </svg>
      </button>

      <button
        class="w-8 h-8 rounded-lg flex items-center justify-center transition-all border"
        :class="
          sessionStore.remoteSystemVolume > 0
            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
            : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
        "
        :title="
          sessionStore.remoteSystemVolume > 0 ? 'Wycisz system Hosta' : 'Włącz dźwięk systemu Hosta'
        "
        @click="toggleSystemAudio"
      >
        <svg viewBox="0 0 24 24" class="w-4 h-4">
          <path
            fill="currentColor"
            d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
          />
        </svg>
      </button>

      <button
        class="w-8 h-8 rounded-lg flex items-center justify-center transition-all border"
        :class="
          sessionStore.remoteMicVolume > 0
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
            : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
        "
        :title="sessionStore.remoteMicVolume > 0 ? 'Wycisz mikrofon Hosta' : 'Włącz mikrofon Hosta'"
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

    <div v-if="isGuestLockedOut" class="relative flex flex-col items-center">
      <div class="text-orange-400 animate-pulse">
        <svg viewBox="0 0 24 24" class="w-5 h-5">
          <path
            fill="currentColor"
            d="M12 17a2 2 0 0 0 2-2 2 2 0 0 0-2-2 2 2 0 0 0-2 2 2 2 0 0 0 2 2m6-9h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2m-6-8a3 3 0 0 1 3 3v2H9V5a3 3 0 0 1 3-3Z"
          />
        </svg>
      </div>

      <span class="absolute -bottom-4 text-[9px] font-mono font-bold text-orange-400">
        {{ remainingTime.toFixed(1) }}s
      </span>

      <div
        class="absolute -bottom-[12px] left-0 w-[280px] h-[2px] bg-white/5 rounded-full overflow-hidden"
      >
        <div
          class="h-full bg-orange-500 transition-all duration-75 ease-linear"
          :style="{ width: `${lockoutProgress}%` }"
        />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { useSessionStore } from '@renderer/stores/sessionStore'
import { useHidChannel } from '@renderer/composables/channels/HidChannel'
import VideoPlayer from '../p2p/VideoPlayer.vue'

const webRtcStore = useWebRtcStore()
const sessionStore = useSessionStore()
const hidChannel = useHidChannel()

const videoContainer = ref<HTMLElement | null>(null)

const isControlGranted = computed({
  get: () => hidChannel.isControlGranted.value,
  set: (val) => {
    if (val) hidChannel.grantControl()
    else hidChannel.revokeControl()
  }
})

// --- LOCKOUT (Bez zmian) ---
const LOCKOUT_DURATION_MS = 3000
const isGuestLockedOut = ref(false)
const lockoutUntil = ref(0)
const currentTime = ref(Date.now())
let timerInterval: ReturnType<typeof setInterval> | null = null

const remainingTime = computed(() => {
  if (!isGuestLockedOut.value) return 0
  return Math.max(0, (lockoutUntil.value - currentTime.value) / 1000)
})

const lockoutProgress = computed(() => {
  const current = lockoutUntil.value - currentTime.value
  return Math.min(100, Math.max(0, (current / LOCKOUT_DURATION_MS) * 100))
})

const stopTimer = (): void => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

const handleHostLockout = (_, data: { active: boolean; until: number }): void => {
  isGuestLockedOut.value = data.active
  lockoutUntil.value = data.until

  if (data.active && !timerInterval) {
    timerInterval = setInterval(() => {
      currentTime.value = Date.now()
      if (currentTime.value >= lockoutUntil.value) stopTimer()
    }, 50)
  }

  if (!data.active) stopTimer()
}

onMounted(() => {
  window.electron.ipcRenderer.on('input:host-lockout', handleHostLockout)
})

onUnmounted(() => {
  stopTimer()
  window.electron.ipcRenderer.removeListener('input:host-lockout', handleHostLockout)
})

// --- ACTIONS ---
const toggleControl = async (): Promise<void> => {
  const newValue = !isControlGranted.value

  try {
    await window.electron.ipcRenderer.invoke('widget:toggle-control', {
      granted: newValue
    })

    isControlGranted.value = newValue
  } catch (e) {
    console.error('Błąd przełączania kontroli:', e)
  }
}

const toggleSystemAudio = (): void => {
  sessionStore.remoteSystemVolume = sessionStore.remoteSystemVolume > 0 ? 0 : 1
}

const toggleMicAudio = (): void => {
  sessionStore.remoteMicVolume = sessionStore.remoteMicVolume > 0 ? 0 : 1
}

const handleMouseMove = (event: MouseEvent): void => {
  if (!hidChannel.isControlGranted.value || !videoContainer.value) return

  const rect = videoContainer.value.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 100
  const y = ((event.clientY - rect.top) / rect.height) * 100

  hidChannel.sendMouseFromVideo(Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)))
}
</script>
