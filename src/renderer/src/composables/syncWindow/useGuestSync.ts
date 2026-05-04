import { onMounted, onUnmounted, watch } from 'vue'
import { useSessionStore } from '@renderer/stores/sessionStore'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { useSocketStore } from '@renderer/stores/socketStore'

export interface UseGuestSyncReturn {
  sendCommand: (type: string, payload?: unknown) => void
}

export function useGuestSync(isMainWindow: boolean): UseGuestSyncReturn {
  let syncChannel: BroadcastChannel | null = null

  onMounted(() => {
    const sessionStore = useSessionStore()
    const webRtcStore = useWebRtcStore()
    const socketStore = useSocketStore()

    syncChannel = new BroadcastChannel('guest-sync-channel')

    if (isMainWindow) {
      const pushStateToGuest = (): void => {
        if (!syncChannel) return
        syncChannel.postMessage({
          type: 'STATE_UPDATE',
          payload: {
            microphoneMuted: sessionStore.microphoneMuted,
            localMicrophoneVolume: sessionStore.localMicrophoneVolume,
            remoteSystemVolume: sessionStore.remoteSystemVolume,
            rtcStatus: webRtcStore.rtcStatus
          }
        })
      }

      syncChannel.onmessage = (event) => {
        const { type, payload } = event.data

        switch (type) {
          case 'REQUEST_STATE':
            pushStateToGuest()
            break
          case 'COMMAND_DISCONNECT':
            socketStore.disconnect()
            break
          case 'COMMAND_TOGGLE_MIC':
            sessionStore.toggleMicrophone(payload as boolean)
            break
          case 'COMMAND_SET_MIC_VOL':
            sessionStore.localMicrophoneVolume = payload as number
            break
          case 'COMMAND_SET_SYS_VOL':
            sessionStore.remoteSystemVolume = payload as number
            break
        }
      }

      watch(
        () => [
          sessionStore.microphoneMuted,
          sessionStore.localMicrophoneVolume,
          sessionStore.remoteSystemVolume,
          webRtcStore.rtcStatus
        ],
        () => {
          pushStateToGuest()
        }
      )
    } else {
      syncChannel.onmessage = (event) => {
        if (event.data.type === 'HOST_DISCONNECTED') {
          console.log('[GuestSync] Połączenie zakończone. Zamykam okno.')
          if (window.api?.app?.closeGuestWindow) {
            window.api.app.closeGuestWindow().catch(() => window.close())
          } else {
            window.close()
          }
        }
      }
    }
  })

  onUnmounted(() => {
    if (syncChannel) syncChannel.close()
  })

  const sendCommand = (type: string, payload?: unknown): void => {
    if (syncChannel && !isMainWindow) {
      syncChannel.postMessage({ type, payload })
    }
  }

  return { sendCommand }
}
