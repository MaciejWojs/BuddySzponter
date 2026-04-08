// renderer/src/stores/socketStore.ts

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useWebRtcStore } from './webRtcStore'
import { useConnectionStore } from './connectionStore'
import { wsService } from '@renderer/composables/connection/webSocketService'
import { WsRequestAccess } from '@shared/schemas/ws'
import { WsActionResponse, WsConnectResponse } from '@shared/schemas/ipc'

export const useSocketStore = defineStore('socket', () => {
  const isConnected = ref(false)
  const incomingRequest = ref<WsRequestAccess | null>(null)
  const isAcknowledged = ref(false)

  const init = (): void => {
    const rtcStore = useWebRtcStore()
    const connectionStore = useConnectionStore()

    wsService.setupConnection({
      onConnected: () => {
        isConnected.value = true
      },
      onDisconnected: () => {
        isConnected.value = false
        isAcknowledged.value = false
        rtcStore.forceDisconnect()
      },
      onConnectError: (err) => console.error('[SocketStore]', err.message)
    })

    wsService.setupAccess({
      onRequest: (data) => {
        incomingRequest.value = data
        console.log('[SocketStore] Otrzymano żądanie dostępu:', data)
      },
      onAccepted: (data) => {
        console.log('[SocketStore] Żądanie dostępu zaakceptowane:', data)
        // connectionStore.handleAccessAccepted(data)
      },
      onRejected: () => {
        resetLocalState()

        const connectionStore = useConnectionStore()
        connectionStore.handleAccessRejected()
      },
      onError: (err) => console.error('[SocketStore]', err.message)
    })

    wsService.setupHandshake({
      onAcknowledged: () => {
        isAcknowledged.value = true
        if (connectionStore.isHost) {
          // wsService.hostAcknowledge()
          rtcStore.startConnectionAsHost()
        }
      }
    })

    wsService.setupWebRtc({
      onOffer: (data) => rtcStore.handleOffer(data),
      onAnswer: (data) => rtcStore.handleAnswer(data),
      onIceCandidate: (data) => rtcStore.handleCandidate(data),
      onReady: () => console.log('[SocketStore] P2P Ready!')
    })
  }

  const resetLocalState = (): void => {
    incomingRequest.value = null
    isAcknowledged.value = false
  }

  const connect = async (token: string): Promise<WsConnectResponse> => {
    resetLocalState()
    return await wsService.connect(token)
  }

  const disconnect = async (): Promise<WsActionResponse> => {
    const rtcStore = useWebRtcStore()
    await rtcStore.disconnect()

    const res = await wsService.disconnect()
    isConnected.value = false
    resetLocalState()
    return res
  }

  const respondToRequest = async (accept: boolean): Promise<void> => {
    if (accept) await wsService.respondAccept()
    else await wsService.respondReject()
    incomingRequest.value = null
  }

  return {
    isConnected,
    incomingRequest,
    isAcknowledged,
    wsService,
    init,
    connect,
    disconnect,
    respondToRequest
  }
})
