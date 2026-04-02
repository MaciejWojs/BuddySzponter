import { defineStore } from 'pinia'
import { ref } from 'vue'
import { wsService } from '@renderer/composables/connection/webSocketService'
import type { WsActionResponse, WsConnectResponse, WsServerEvents } from '@shared/schemas/ipc'
import { useConnectionStore } from './connectionStore'
import { useWebRtcStore } from './useWebRtcStore'

export const useSocketStore = defineStore('socket', () => {
  // ==========================================
  // --- STAN REAKTYWNY (To czyta UI) ---
  // ==========================================
  const isConnected = ref(false)
  const incomingRequest = ref<WsServerEvents['ws:request-access'] | null>(null)
  const accessStatus = ref<'accepted' | 'rejected' | null>(null)
  const isAcknowledged = ref(false)

  // ==========================================
  // --- INICJALIZACJA NASŁUCHIWANIA ---
  // ==========================================

  wsService.onConnected(() => {
    isConnected.value = true
  })

  wsService.onDisconnected(() => {
    console.warn('[SocketStore] Rozłączono gniazdko WebSocket. Jeśli sesja P2P trwa, zignoruj to!')
    isConnected.value = false
    incomingRequest.value = null
  })

  wsService.onRequestAccess((data) => {
    incomingRequest.value = data
  })

  wsService.onAccessAccepted(() => {
    accessStatus.value = 'accepted'
    wsService.guestAcknowledge()
  })

  wsService.onAccessRejected(() => {
    accessStatus.value = 'rejected'
  })

  wsService.onAcknowledged(() => {
    if (isAcknowledged.value === false) {
      isAcknowledged.value = true

      const connectionStore = useConnectionStore()

      if (connectionStore.isHost) {
        wsService.hostAcknowledge()

        const webRtcStore = useWebRtcStore()
        webRtcStore.startConnectionAsHost()
      }
    }
  })

  // ==========================================
  // --- AKCJE (To wywołuje UI) ---
  // ==========================================

  const connect = async (token: string): Promise<WsConnectResponse> => {
    return await wsService.connect(token)
  }

  const disconnect = async (): Promise<WsActionResponse> => {
    return await wsService.disconnect()
  }

  const respondToRequest = async (accept: boolean): Promise<void> => {
    if (!incomingRequest.value) return

    if (accept) {
      await wsService.respondAccept()
    } else {
      await wsService.respondReject()
    }
    incomingRequest.value = null
  }

  return {
    isConnected,
    incomingRequest,
    accessStatus,
    isAcknowledged, // Zwracamy bez rtcStatus!
    connect,
    disconnect,
    respondToRequest,
    wsService
  }
})
