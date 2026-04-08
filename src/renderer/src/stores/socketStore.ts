import { wsService } from '@renderer/composables/connection/webSocketService'
import { useWebRtcStore } from './webRtcStore'
import { WsActionResponse, WsConnectResponse, WsServerEvents } from '@shared/schemas/ipc'
import { useConnectionStore } from './connectionStore'

export const useSocketStore = defineStore('socket', () => {
  const isConnected = ref(false)
  const incomingRequest = ref<WsServerEvents['ws:request-access'] | null>(null)
  const accessStatus = ref<'accepted' | 'rejected' | null>(null)
  const isAcknowledged = ref(false)

  const resetLocalState = (): void => {
    isAcknowledged.value = false
    accessStatus.value = null
    incomingRequest.value = null
  }

  // --- LISTENERS ---

  wsService.onConnected(() => {
    isConnected.value = true
  })

  wsService.onDisconnected(async () => {
    console.warn('[SocketStore] WebSocket rozłączony.')
    isConnected.value = false
    await useWebRtcStore().disconnect()

    resetLocalState()
  })

  wsService.onRequestAccess((data) => {
    incomingRequest.value = data
  })

  wsService.onAccessAccepted(() => {
    accessStatus.value = 'accepted'
    wsService.guestAcknowledge()
  })

  wsService.onAcknowledged(() => {
    if (!isAcknowledged.value) {
      isAcknowledged.value = true
      const connectionStore = useConnectionStore()

      if (connectionStore.isHost) {
        wsService.hostAcknowledge()
        useWebRtcStore().startConnectionAsHost()
      }
    }
  })

  // --- ACTIONS ---

  const connect = async (token: string): Promise<WsConnectResponse> => {
    resetLocalState()
    return await wsService.connect(token)
  }

  const disconnect = async (): Promise<WsActionResponse> => {
    await useWebRtcStore().disconnect()
    resetLocalState()
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
    isAcknowledged,
    connect,
    disconnect,
    respondToRequest,
    wsService
  }
})
