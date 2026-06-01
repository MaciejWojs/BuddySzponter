import { onMounted, onUnmounted, watch } from 'vue'
import { useSessionStore } from '@renderer/stores/sessionStore'
import { useAudioSettingsStore } from '@renderer/stores/audioSettingsStore'
import { useHidChannel } from '@renderer/composables/channels/HidChannel'
import { useSocketStore } from '@renderer/stores/socketStore'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { useConnectionStore } from '@renderer/stores/connectionStore'
import { chatService, type ChatPayload } from '@renderer/services/chatService'
import {
  resolveRelayFileStarted,
  type OutgoingFileOfferMeta
} from '@renderer/composables/channels/FileTransferChannel'

type WidgetMode = 'normal' | 'compact' | 'hidden' | 'peek'

export function useWidgetSync(): void {
  let widgetChannel: BroadcastChannel | null = null
  let guestChannel: BroadcastChannel | null = null

  onMounted(() => {
    const sessionStore = useSessionStore()
    const audioStore = useAudioSettingsStore()
    const socketStore = useSocketStore()
    const hidChannel = useHidChannel()
    const webRtcStore = useWebRtcStore()
    const connectionStore = useConnectionStore()

    widgetChannel = new BroadcastChannel('widget-sync-channel')
    guestChannel = new BroadcastChannel('guest-sync-channel')

    const pushStateToWidget = (): void => {
      if (!widgetChannel) return
      widgetChannel.postMessage({
        type: 'STATE_UPDATE',
        payload: {
          micActive: !sessionStore.microphoneMuted && sessionStore.localMicrophoneVolume > 0,
          sysActive: sessionStore.localSystemAudioVolume > 0,
          // Host widget button should reflect host-side guest mic routing toggle.
          guestMicActive: sessionStore.remoteMicVolume > 0,
          controlGranted: hidChannel.isControlGranted.value,
          clipboardSyncEnabled: hidChannel.clipboardSyncEnabled.value,
          chatHasUnread: chatService.hasUnread.value,
          guestName: chatService.localSenderName.value || ''
        }
      })
    }

    chatService
      .refreshLocalSenderName()
      .then(() => pushStateToWidget())
      .catch(() => {})

    const pushStateToGuestAndTray = (): void => {
      if (!guestChannel) return
      guestChannel.postMessage({
        type: 'STATE_UPDATE',
        payload: {
          microphoneMuted: audioStore.guestRelayMicrophoneMuted,
          localMicrophoneVolume: sessionStore.localMicrophoneVolume,
          remoteSystemVolume: sessionStore.remoteSystemVolume,
          rtcStatus: webRtcStore.rtcStatus,
          connectionCode: connectionStore.connectionCode,
          hostName: chatService.localSenderName.value || ''
        }
      })
    }

    widgetChannel.onmessage = async (event: MessageEvent<{ type: string; payload: unknown }>) => {
      const { type, payload } = event.data

      switch (type) {
        case 'REQUEST_STATE':
          pushStateToWidget()
          break
        case 'TOGGLE_MIC':
          sessionStore.toggleMicrophone(!sessionStore.microphoneMuted)
          break
        case 'TOGGLE_SYSTEM':
          sessionStore.localSystemAudioVolume = sessionStore.localSystemAudioVolume > 0 ? 0 : 1
          break
        case 'TOGGLE_GUEST_MIC':
          sessionStore.remoteMicVolume = sessionStore.remoteMicVolume > 0 ? 0 : 1
          break
        case 'TOGGLE_CONTROL':
          if (hidChannel.isControlGranted.value) {
            await hidChannel.revokeControl()
          } else {
            await hidChannel.grantControl()
          }
          break
        case 'TOGGLE_CLIPBOARD_SYNC':
          if (!hidChannel.isControlGranted.value) break
          hidChannel.setClipboardSyncEnabled(!hidChannel.clipboardSyncEnabled.value)
          break
        case 'END_SESSION':
          await socketStore.disconnect()
          window.api?.app?.hideHostWidget().catch(() => {})
          break
        case 'SET_WIDGET_MODE':
          if (window.electron?.ipcRenderer) {
            window.electron.ipcRenderer.invoke('set-host-widget-mode', payload as WidgetMode)
          }
          break
      }
    }

    guestChannel.onmessage = (event) => {
      const { type, payload } = event.data

      switch (type) {
        case 'REQUEST_STATE':
          pushStateToGuestAndTray()
          break
        case 'COMMAND_DISCONNECT':
          socketStore.disconnect()
          break
        case 'COMMAND_TOGGLE_MIC':
          audioStore.setGuestRelayMicrophoneMuted(Boolean(payload))
          break
        case 'COMMAND_SET_MIC_VOL':
          sessionStore.localMicrophoneVolume = payload as number
          break
        case 'COMMAND_SET_SYS_VOL':
          sessionStore.remoteSystemVolume = payload as number
          break
        case 'RELAY_CHAT':
          chatService.ingestChatPayload(payload as ChatPayload)
          break
        case 'RELAY_FILE_STARTED': {
          const data = event.data as {
            correlationId?: unknown
            result?: OutgoingFileOfferMeta | null
          }
          resolveRelayFileStarted(data.correlationId, data.result ?? null)
          break
        }
      }
    }

    watch(
      [
        () => sessionStore.microphoneMuted,
        () => sessionStore.localMicrophoneVolume,
        () => sessionStore.localSystemAudioVolume,
        () => sessionStore.remoteMicVolume,
        () => audioStore.guestRelayMicrophoneMuted,
        () => hidChannel.isControlGranted.value,
        () => hidChannel.clipboardSyncEnabled.value,
        () => chatService.hasUnread.value,
        () => chatService.localSenderName.value
      ],
      () => pushStateToWidget(),
      { deep: true }
    )

    watch(
      () => [
        audioStore.guestRelayMicrophoneMuted,
        sessionStore.localMicrophoneVolume,
        sessionStore.remoteSystemVolume,
        webRtcStore.rtcStatus,
        connectionStore.connectionCode,
        chatService.localSenderName.value
      ],
      () => pushStateToGuestAndTray(),
      { deep: true }
    )

    watch(
      () => webRtcStore.rtcStatus,
      (status) => {
        if (status === 'disconnected') {
          audioStore.setGuestRelayMicrophoneMuted(true)
        }
      }
    )
  })

  onUnmounted(() => {
    if (widgetChannel) widgetChannel.close()
    if (guestChannel) guestChannel.close()
  })
}
