// renderer/src/stores/socketStore.ts

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useWebRtcStore } from './webRtcStore'
import { useConnectionStore } from './connectionStore'
import { wsService } from '@renderer/composables/connection/webSocketService'
import { WsRequestAccess } from '@shared/schemas/ws'
import { WsActionResponse, WsConnectResponse } from '@shared/schemas/ipc'

export const useSocketStore = defineStore('socket', () => {
  const RECONNECT_MAX_ATTEMPTS = 4
  const RECONNECT_BASE_DELAY_MS = 1000

  const isConnected = ref(false)
  const incomingRequest = ref<WsRequestAccess | null>(null)
  const isAcknowledged = ref(false)
  const isReconnecting = ref(false)

  let lastConnectionToken: string | null = null
  let skipNextDisconnectHandler = false

  const wait = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(resolve, ms)
    })

  const tryReconnect = async (): Promise<boolean> => {
    if (!lastConnectionToken) return false

    isReconnecting.value = true

    for (let attempt = 1; attempt <= RECONNECT_MAX_ATTEMPTS; attempt += 1) {
      const res = await wsService.connect(lastConnectionToken)
      if (res.success) {
        isReconnecting.value = false
        return true
      }

      const delayMs = RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1)
      await wait(delayMs)
    }

    isReconnecting.value = false
    return false
  }

  const init = (): void => {
    const rtcStore = useWebRtcStore()
    const connectionStore = useConnectionStore()

    wsService.setupConnection({
      onConnected: () => {
        isConnected.value = true
      },
      onDisconnected: async () => {
        if (skipNextDisconnectHandler) {
          skipNextDisconnectHandler = false
          return
        }

        isConnected.value = false
        isAcknowledged.value = false

        const reconnected = await tryReconnect()
        if (reconnected) {
          return
        }

        rtcStore.forceDisconnect()
        connectionStore.resetState()
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
        isAcknowledged.value = true
        incomingRequest.value = null
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
    lastConnectionToken = token
    resetLocalState()
    return await wsService.connect(token)
  }

  const disconnect = async (): Promise<WsActionResponse> => {
    skipNextDisconnectHandler = true
    lastConnectionToken = null

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
    isReconnecting,
    wsService,
    init,
    connect,
    disconnect,
    respondToRequest
  }
})
