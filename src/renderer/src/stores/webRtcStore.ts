// renderer/src/stores/webRtcStore.ts
import { defineStore } from 'pinia'
import { ref, shallowRef, triggerRef, watch } from 'vue'
import {
  guestTrackPolicy,
  hostTrackPolicy,
  webRtcService
} from '@renderer/composables/connection/webRTCService'
import { messageRouter } from '@renderer/composables/webrtc/MessageRouter'
import { useHidChannel } from '@renderer/composables/channels/HidChannel'
import '@renderer/composables/channels/ChatChannel'
import {
  dispatchFileTransferBinary,
  dispatchFileTransferControl,
  resetFileTransferState,
  shouldIgnoreClipboardBridgeFilesEcho,
  shouldIgnoreOutgoingClipboardPaths,
  startOutgoingFileTransfer
} from '@renderer/composables/channels/FileTransferChannel'
import { chatService } from '@renderer/services/chatService'
import { useSocketStore } from './socketStore'

const CLIPBOARD_P2P_LOG = '[ClipboardP2P]'

const HOST_P2P_CONNECT_TIMEOUT_MS = 60_000

export const useWebRtcStore = defineStore('webrtc', () => {
  // --- STAN POŁĄCZENIA ---
  const rtcStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const localStream = shallowRef<MediaStream | null>(null)
  const remoteStream = shallowRef<MediaStream | null>(null)
  const localPublishProfile = ref<'host' | 'guest'>('host')

  let hostConnectingDeadlineTimer: ReturnType<typeof setTimeout> | null = null

  const clearHostConnectingDeadline = (): void => {
    if (hostConnectingDeadlineTimer != null) {
      clearTimeout(hostConnectingDeadlineTimer)
      hostConnectingDeadlineTimer = null
    }
  }

  const hid = useHidChannel()

  const getCurrentTrackPolicy = (): typeof guestTrackPolicy | typeof hostTrackPolicy => {
    return localPublishProfile.value === 'guest' ? guestTrackPolicy : hostTrackPolicy
  }

  webRtcService.onMessageReceived = (data: string | ArrayBuffer, channelLabel: string): void => {
    if (channelLabel === 'file-transfer') {
      if (typeof data === 'string') {
        dispatchFileTransferControl(data)
      } else {
        void dispatchFileTransferBinary(data).catch((err) => {
          console.error('[ClipboardP2P]', 'dispatchFileTransferBinary', err)
        })
      }
      return
    }

    if (typeof data !== 'string') {
      return
    }

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

  webRtcService.onConnectionFailed = (): void => {
    if (localPublishProfile.value !== 'host' || rtcStatus.value !== 'connecting') return
    console.log('[WebRtcStore] WebRTC failed while host connecting; full disconnect')
    void useSocketStore().disconnect(true)
  }

  watch(
    () => [rtcStatus.value, localPublishProfile.value] as const,
    ([status, profile]) => {
      if (status === 'connecting' && profile === 'host') {
        clearHostConnectingDeadline()
        hostConnectingDeadlineTimer = setTimeout(() => {
          hostConnectingDeadlineTimer = null
          if (rtcStatus.value === 'connecting' && localPublishProfile.value === 'host') {
            console.log('[WebRtcStore] Host P2P connect timeout; full disconnect')
            void useSocketStore().disconnect(true)
          }
        }, HOST_P2P_CONNECT_TIMEOUT_MS)
      } else {
        clearHostConnectingDeadline()
      }
    },
    { immediate: true }
  )

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
      if (localPublishProfile.value !== 'host' || rtcStatus.value !== 'connected') {
        return
      }
      hid.sendHostCursorSync(cursorType)
    })
  }

  if (window.api?.clipboard?.onBridgeText) {
    window.api.clipboard.onBridgeText((text) => {
      if (rtcStatus.value !== 'connected') return
      hid.sendClipboardText(text)
    })
  }

  if (window.api?.clipboard?.onBridgeFiles) {
    window.api.clipboard.onBridgeFiles((paths) => {
      if (rtcStatus.value !== 'connected') {
        console.info(CLIPBOARD_P2P_LOG, 'onBridgeFiles skip: not connected', {
          rtcStatus: rtcStatus.value,
          pathCount: paths.length
        })
        return
      }
      if (shouldIgnoreClipboardBridgeFilesEcho()) {
        console.info(CLIPBOARD_P2P_LOG, 'onBridgeFiles skip: echo mute')
        return
      }
      if (shouldIgnoreOutgoingClipboardPaths(paths)) {
        console.info(CLIPBOARD_P2P_LOG, 'onBridgeFiles skip: path fingerprint (post-receive)')
        return
      }
      console.info(CLIPBOARD_P2P_LOG, 'onBridgeFiles → startOutgoingFileTransfer', {
        pathCount: paths.length
      })
      void startOutgoingFileTransfer(paths, 'clipboard')
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
    clearHostConnectingDeadline()
    rtcStatus.value = 'disconnected'
    resetFileTransferState()
    webRtcService.cleanup()
    remoteStream.value = null
    if (localPublishProfile.value === 'host') {
      void window.api?.input?.releaseStuckKeyboardKeys?.().catch(() => {})
    }
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
    } else if (kind === 'audio' && tracks.length > 0) {
      const isLikelyDesktopLoopback = (t: MediaStreamTrack): boolean => {
        const s = t.getSettings() as MediaTrackSettings & { displaySurface?: string }
        if (
          s.displaySurface === 'monitor' ||
          s.displaySurface === 'window' ||
          s.displaySurface === 'browser'
        )
          return true
        const label = (t.label || '').toLowerCase()
        return (
          label.includes('loopback') ||
          label.includes('what u hear') ||
          label.includes('stereo mix')
        )
      }
      if (contentHint === 'speech') {
        const t = tracks.find((tr) => !isLikelyDesktopLoopback(tr)) ?? tracks[0] ?? null
        if (t) t.enabled = isEnabled
      } else if (contentHint === 'music') {
        const t =
          tracks.find((tr) => isLikelyDesktopLoopback(tr)) ?? tracks[tracks.length - 1] ?? null
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
