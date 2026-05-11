<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

import { useSignalingStore } from '@renderer/stores/signalingStore'
import { useGuestSync } from '@renderer/composables/syncWindow/useGuestSync'
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { chatService, type ChatPayload } from '@renderer/services/chatService'
import GuestFloatingPanel from '@renderer/components/session/guest/GuestFloatingPanel.vue'
import GuestControlsToolbar from '@renderer/components/session/guest/GuestControlsToolbar.vue'
import ChatPanel from '@renderer/components/chat/ChatPanel.vue'

const signalingStore = useSignalingStore()
const { sendCommand } = useGuestSync()
const webRtcStore = useWebRtcStore()

const isVideoReady = ref(false)
const chatVisible = ref(false)

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

const handleMicVolumeChange = (value: number): void => {
  state.value.localMicrophoneVolume = value
  sendCommand('COMMAND_SET_MIC_VOL', value)
}

const handleSysVolumeChange = (value: number): void => {
  state.value.remoteSystemVolume = value
  sendCommand('COMMAND_SET_SYS_VOL', value)
}

const handleDisconnect = async (): Promise<void> => {
  await webRtcStore.disconnect()
  sendCommand('COMMAND_DISCONNECT')
}

const toggleChat = (): void => {
  chatVisible.value = !chatVisible.value
}

const closeChat = (): void => {
  chatVisible.value = false
}

watch(chatVisible, (visible) => {
  if (visible) chatService.markConversationRead()
})

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
    } else if (type === 'RELAY_CHAT_OUTGOING') {
      webRtcService.sendData(
        'chat-channel',
        JSON.stringify({ type: 'CHAT', payload: payload as ChatPayload })
      )
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
  <div class="relative w-full h-screen overflow-hidden bg-[#0a0a0a] font-sans">
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

    <template v-if="isVideoReady">
      <GuestFloatingPanel title="Sterowanie" :initial-x="32" :initial-y="32">
        <GuestControlsToolbar
          :microphone-muted="state.microphoneMuted"
          :local-microphone-volume="state.localMicrophoneVolume"
          :remote-system-volume="state.remoteSystemVolume"
          :chat-visible="chatVisible"
          :chat-has-unread="chatService.hasUnread.value"
          @toggle-mic="handleMicToggle"
          @update-mic-volume="handleMicVolumeChange"
          @update-sys-volume="handleSysVolumeChange"
          @toggle-chat="toggleChat"
          @disconnect="handleDisconnect"
        />
      </GuestFloatingPanel>

      <GuestFloatingPanel v-show="chatVisible" title="Czat" :initial-x="32" :initial-y="120">
        <div class="h-[420px] w-[320px] p-2">
          <ChatPanel panel-class="h-full" @close="closeChat" />
        </div>
      </GuestFloatingPanel>
    </template>
  </div>
</template>
