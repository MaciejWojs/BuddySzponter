import { onMounted, onUnmounted } from 'vue'

export interface UseGuestSyncReturn {
  sendCommand: (type: string, payload?: unknown) => void
}

export function useGuestSync(): UseGuestSyncReturn {
  let syncChannel: BroadcastChannel | null = null

  onMounted(() => {
    syncChannel = new BroadcastChannel('guest-sync-channel')

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
  })

  onUnmounted(() => {
    if (syncChannel) syncChannel.close()
  })

  const sendCommand = (type: string, payload?: unknown): void => {
    if (syncChannel) {
      syncChannel.postMessage({ type, payload })
    }
  }

  return { sendCommand }
}
