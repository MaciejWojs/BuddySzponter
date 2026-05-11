// renderer/src/stores/webRtcStore.ts
import { defineStore } from 'pinia'
import { ref, shallowRef, triggerRef } from 'vue'
import {
  guestTrackPolicy,
  hostTrackPolicy,
  webRtcService
} from '@renderer/composables/connection/webRTCService'
import { messageRouter } from '@renderer/composables/webrtc/MessageRouter'
import { useHidChannel } from '@renderer/composables/channels/HidChannel'
import '@renderer/composables/channels/ChatChannel'
import { chatService } from '@renderer/services/chatService'
import { useSocketStore } from './socketStore'

export const useWebRtcStore = defineStore('webrtc', () => {
  // --- STAN POŁĄCZENIA ---
  const rtcStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const localStream = shallowRef<MediaStream | null>(null)
  const remoteStream = shallowRef<MediaStream | null>(null)
  const localPublishProfile = ref<'host' | 'guest'>('host')

  const hid = useHidChannel()

  const getCurrentTrackPolicy = (): typeof guestTrackPolicy | typeof hostTrackPolicy => {
    return localPublishProfile.value === 'guest' ? guestTrackPolicy : hostTrackPolicy
  }

  webRtcService.onMessageReceived = (data: string, channelLabel: string): void => {
    if (channelLabel === 'system-events') {
      try {
        const parsed = JSON.parse(data)
        if (parsed.type === 'DISCONNECT') {
          console.log('[WebRtcStore] Otrzymano sygnał DISCONNECT (P2P)')
          if (localPublishProfile.value === 'guest') {
            const relay = new BroadcastChannel('guest-sync-channel')
            relay.postMessage({ type: 'COMMAND_DISCONNECT' })
            relay.close()
          } else {
            const socketStore = useSocketStore()
            socketStore.disconnect(true)
          }
          return
        }
      } catch (e) {
        console.warn('[WebRtcStore] Błąd parsowania system-events:', e)
      }
    }
    messageRouter.route(channelLabel, data)
  }

  webRtcService.onRemoteStreamReceived = (stream): void => {
    remoteStream.value = stream
  }

  webRtcService.onDataChannelOpened = (): void => {
    rtcStatus.value = 'connected'

    if (localPublishProfile.value === 'host') {
      console.log('[WebRtcStore] Połączenie otwarte, wysyłam HID Handshake...')
      hid.sendHandshake()
      window.api?.input?.startCursorP2PRelay?.().catch((e) => {
        console.warn('[WebRtcStore] Nie udało się uruchomić relayu kursora:', e)
      })
    }
  }

  if (window.api?.input?.onHostCursorSync) {
    window.api.input.onHostCursorSync((cursorType) => {
      if (
        localPublishProfile.value !== 'host' ||
        rtcStatus.value !== 'connected'
      ) {
        return
      }
      hid.sendHostCursorSync(cursorType)
    })
  }

  // --- ACTIONS ---

  const publishLocalStream = async (stream: MediaStream): Promise<void> => {
    localStream.value = new MediaStream(stream.getTracks())
    triggerRef(localStream)
    if (rtcStatus.value === 'disconnected') return
    webRtcService.publishLocalStream(stream, getCurrentTrackPolicy())
  }

  const setLocalPublishProfile = (profile: 'host' | 'guest'): void => {
    localPublishProfile.value = profile
    if (rtcStatus.value !== 'disconnected' && localStream.value) {
      webRtcService.publishLocalStream(localStream.value, getCurrentTrackPolicy())
    }

    if (rtcStatus.value === 'connected' && profile === 'host') {
      hid.sendHandshake()
    }
  }

  const forceDisconnect = (): void => {
    rtcStatus.value = 'disconnected'
    webRtcService.cleanup()
    remoteStream.value = null
    localPublishProfile.value = 'host'
    chatService.clearMessages()
    hid.resetState()
    window.api?.input?.stopCursorP2PRelay?.().catch(() => {})
  }

  const disconnect = async (): Promise<void> => {
    if (rtcStatus.value === 'disconnected') return

    try {
      webRtcService.sendData('system-events', JSON.stringify({ type: 'DISCONNECT', payload: {} }))
    } catch (e) {
      console.warn('[WebRtcStore] Nie udało się wysłać sygnału DISCONNECT (kanał zamknięty?):', e)
    }

    await new Promise((resolve) => setTimeout(resolve, 50))

    forceDisconnect()
  }

  const toggleTrackByHint = (
    kind: 'audio' | 'video',
    contentHint: string,
    isEnabled: boolean
  ): void => {
    if (!localStream.value) return
    const tracks =
      kind === 'audio' ? localStream.value.getAudioTracks() : localStream.value.getVideoTracks()
    const targetTrack = tracks.find((t) => t.contentHint === contentHint)

    if (targetTrack) {
      targetTrack.enabled = isEnabled
    } else if (kind === 'audio') {
      if (contentHint === 'speech') {
        const t = tracks.find((t) => t.getSettings().channelCount === 1) || tracks[0]
        if (t) t.enabled = isEnabled
      } else if (contentHint === 'music') {
        const t = tracks.find((t) => t.getSettings().channelCount === 2) || tracks[1]
        if (t) t.enabled = isEnabled
      }
    }

    triggerRef(localStream)
  }

  return {
    rtcStatus,
    localStream,
    remoteStream,
    localPublishProfile,

    getCurrentTrackPolicy,
    publishLocalStream,
    setLocalPublishProfile,
    forceDisconnect,
    disconnect,
    toggleTrackByHint,

    getRemoteTrackRole: (id: string) => webRtcService.getRemoteTrackRole(id)
  }
})
