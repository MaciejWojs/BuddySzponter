<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

import { useSignalingStore } from '@renderer/stores/signalingStore'
import { useGuestSync } from '@renderer/composables/syncWindow/useGuestSync'
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'

const signalingStore = useSignalingStore()
const { sendCommand } = useGuestSync()
const webRtcStore = useWebRtcStore()

const isVideoReady = ref(false)

const state = ref({
  microphoneMuted: false,
  localMicrophoneVolume: 1,
  remoteSystemVolume: 1
})

const handleVideoReady = (width: number, height: number): void => {
  isVideoReady.value = true
  if (window.api?.app?.resizeToVideoRatio) {
    window.api.app.resizeToVideoRatio(width, height).catch(() => {})
  }
}

const handleMicToggle = (): void => {
  state.value.microphoneMuted = !state.value.microphoneMuted
  sendCommand('COMMAND_TOGGLE_MIC', state.value.microphoneMuted)
}

const handleMicVolumeChange = (event: Event): void => {
  const val = parseFloat((event.target as HTMLInputElement).value)
  state.value.localMicrophoneVolume = val
  sendCommand('COMMAND_SET_MIC_VOL', val)
}

const handleSysVolumeChange = (event: Event): void => {
  const val = parseFloat((event.target as HTMLInputElement).value)
  state.value.remoteSystemVolume = val
  sendCommand('COMMAND_SET_SYS_VOL', val)
}

const handleDisconnect = async (): Promise<void> => {
  await webRtcStore.disconnect()
  sendCommand('COMMAND_DISCONNECT')
}

let localRelay: BroadcastChannel | null = null

onMounted(() => {
  localRelay = new BroadcastChannel('guest-sync-channel')

  localRelay.postMessage({ type: 'REQUEST_STATE' })
  localRelay.postMessage({ type: 'GUEST_READY' })

  localRelay.onmessage = async (event) => {
    const { type, payload } = event.data

    if (type === 'STATE_UPDATE') {
      state.value.microphoneMuted = payload.microphoneMuted
      state.value.localMicrophoneVolume = payload.localMicrophoneVolume
      state.value.remoteSystemVolume = payload.remoteSystemVolume
    } else if (type === 'RELAY_OFFER') {
      try {
        const answerStr = await signalingStore.createAnswerForRelay(payload)
        localRelay?.postMessage({ type: 'RELAY_ANSWER', payload: answerStr })
      } catch (error) {
        console.error('[GuestWindow] Błąd podczas tworzenia odpowiedzi P2P:', error)
      }
    } else if (type === 'RELAY_HOST_ICE') {
      await signalingStore.handleCandidate(payload)
    }
  }

  webRtcService.onIceCandidateGenerated = async (candidate) => {
    localRelay?.postMessage({ type: 'RELAY_ICE', payload: candidate.toJSON() })
  }
})

onUnmounted(() => {
  if (localRelay) localRelay.close()
  if (window.api?.app?.resetAspectRatio) {
    window.api.app.resetAspectRatio().catch(() => {})
  }
})
</script>

<template>
  <div class="relative w-full h-screen overflow-hidden bg-[#0a0a0a] group font-sans">
    <div
      v-if="!isVideoReady"
      class="absolute inset-0 flex flex-col items-center justify-center z-40"
    >
      <div
        class="w-10 h-10 border-4 border-white/10 border-t-emerald-500 rounded-full animate-spin mb-4"
      ></div>
      <h3 class="text-white text-lg font-semibold m-0">Nawiązywanie połączenia P2P...</h3>
      <p class="text-gray-400 text-sm mt-2">Tunelowanie strumienia wideo.</p>
    </div>

    <BuGuestVideo class="w-full h-full" @video-ready="handleVideoReady" />

    <div
      v-show="isVideoReady"
      class="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-[#18181b]/80 hover:bg-[#18181b]/95 border border-white/10 px-5 py-3 rounded-full shadow-2xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 z-50"
    >
      <button
        :title="state.microphoneMuted ? 'Włącz mikrofon' : 'Wycisz mikrofon'"
        class="w-10 h-10 flex items-center justify-center rounded-full transition-colors active:scale-95"
        :class="
          state.microphoneMuted
            ? 'bg-rose-500/20 text-rose-500 hover:bg-rose-500/30'
            : 'bg-white/10 text-gray-200 hover:bg-white/20'
        "
        @click="handleMicToggle"
      >
        <svg
          v-if="state.microphoneMuted"
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="2" x2="22" y1="2" y2="22" />
          <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
          <path d="M5 10v2a7 7 0 0 0 12 5" />
          <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      </button>

      <div class="flex items-center gap-2 w-28" title="Głośność Twojego mikrofonu">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-gray-400 shrink-0"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
        <input
          :value="state.localMicrophoneVolume"
          type="range"
          min="0"
          max="2"
          step="0.1"
          class="w-full h-1.5 bg-[#333] rounded-lg appearance-none cursor-pointer accent-white hover:accent-gray-300 transition-all"
          @input="handleMicVolumeChange"
        />
      </div>

      <div class="w-px h-6 bg-white/10 mx-1"></div>

      <div class="flex items-center gap-2 w-28" title="Głośność systemu Hosta">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-gray-400 shrink-0"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
        <input
          :value="state.remoteSystemVolume"
          type="range"
          min="0"
          max="2"
          step="0.1"
          class="w-full h-1.5 bg-[#333] rounded-lg appearance-none cursor-pointer accent-white hover:accent-gray-300 transition-all"
          @input="handleSysVolumeChange"
        />
      </div>

      <div class="w-px h-6 bg-white/10 mx-1"></div>

      <button
        title="Rozłącz sesję"
        class="w-10 h-10 flex items-center justify-center rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/20 transition-all active:scale-95"
        @click="handleDisconnect"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"
          />
          <line x1="22" x2="2" y1="2" y2="22" />
        </svg>
      </button>
    </div>
  </div>
</template>
