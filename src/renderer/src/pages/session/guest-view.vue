<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

import { useSignalingStore } from '@renderer/stores/signalingStore'
import { useGuestSync } from '@renderer/composables/syncWindow/useGuestSync'
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { useAudioSettingsStore } from '@renderer/stores/audioSettingsStore'
import { useHidChannel } from '@renderer/composables/channels/HidChannel'
import { chatService, type ChatPayload } from '@renderer/services/chatService'
import { completeRelayOutgoingFileTransfer } from '@renderer/composables/channels/FileTransferChannel'
import GuestControlsToolbar from '@renderer/components/session/guest/GuestControlsToolbar.vue'
import GuestFloatingPanel from '@renderer/components/session/guest/GuestFloatingPanel.vue'
import ChatPanel from '@renderer/components/chat/ChatPanel.vue'

const signalingStore = useSignalingStore()
const { sendCommand } = useGuestSync()
const webRtcStore = useWebRtcStore()
const audioStore = useAudioSettingsStore()
const hidChannel = useHidChannel()

const isVideoReady = ref(false)
const chatVisible = ref(false)
const toolbarMode = ref<'normal' | 'compact' | 'hidden'>('normal')

const handleSetMode = (mode: 'compact' | 'hidden'): void => {
  toolbarMode.value = mode
}

const state = ref({
  microphoneMuted: true,
  guestMicVolume: 1,
  localMicrophoneVolume: 1,
  remoteSystemVolume: 1,
  hostName: ''
})

const handleVideoReady = (width: number, height: number): void => {
  isVideoReady.value = true
  if (window.api?.app?.resizeToVideoRatio) {
    window.api.app.resizeToVideoRatio(width, height).catch(() => {})
  }
}

const handleMicToggle = (): void => {
  state.value.microphoneMuted = !state.value.microphoneMuted
  const muted = state.value.microphoneMuted
  audioStore.microphoneMuted = muted
  webRtcStore.toggleTrackByHint('audio', 'speech', !muted)
  sendCommand('COMMAND_TOGGLE_MIC', muted)
}

const handleGuestMicVolumeChange = (value: number): void => {
  state.value.guestMicVolume = value
  audioStore.localMicrophoneVolume = value
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

const handleToggleClipboardSync = (): void => {
  if (!hidChannel.isControlGranted.value) return
  hidChannel.setClipboardSyncEnabled(!hidChannel.clipboardSyncEnabled.value)
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
      if (payload.hostName) state.value.hostName = payload.hostName
      audioStore.microphoneMuted = payload.microphoneMuted
      webRtcStore.toggleTrackByHint('audio', 'speech', !payload.microphoneMuted)
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
    } else if (type === 'RELAY_FILE_OUTGOING') {
      const paths = Array.isArray(event.data.paths) ? (event.data.paths as string[]) : []
      const source = (event.data.source as 'clipboard' | 'chat' | 'manual') ?? 'chat'
      const correlationId = event.data.correlationId
      void completeRelayOutgoingFileTransfer(paths, source, correlationId)
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
      <GuestControlsToolbar
        v-if="toolbarMode === 'normal'"
        :microphone-muted="state.microphoneMuted"
        :local-microphone-volume="state.localMicrophoneVolume"
        :remote-system-volume="state.remoteSystemVolume"
        :chat-visible="chatVisible"
        :chat-has-unread="chatService.hasUnread.value"
        :control-granted="hidChannel.isControlGranted.value"
        :clipboard-sync-enabled="hidChannel.clipboardSyncEnabled.value"
        :host-name="state.hostName"
        :guest-mic-volume="state.guestMicVolume"
        :initial-x="32"
        :initial-y="32"
        @toggle-mic="handleMicToggle"
        @update-guest-mic-volume="handleGuestMicVolumeChange"
        @update-mic-volume="handleMicVolumeChange"
        @update-sys-volume="handleSysVolumeChange"
        @toggle-chat="toggleChat"
        @toggle-clipboard-sync="handleToggleClipboardSync"
        @disconnect="handleDisconnect"
        @set-mode="handleSetMode"
      />

      <!-- Restore button shown when toolbar is hidden/compact -->
      <button
        v-if="toolbarMode !== 'normal'"
        class="absolute top-2 left-2 z-50 flex items-center justify-center w-7 h-7 rounded-lg bg-[#090909]/90 border border-[#1c1c1c] text-violet-500 hover:text-violet-300 transition-colors"
        title="Pokaż pasek sterowania"
        @click="toolbarMode = 'normal'"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <GuestFloatingPanel v-show="chatVisible" title="Czat" :initial-x="32" :initial-y="120">
        <div class="h-[420px] w-[320px] p-2">
          <ChatPanel panel-class="h-full" @close="closeChat" />
        </div>
      </GuestFloatingPanel>
    </template>
  </div>
</template>
