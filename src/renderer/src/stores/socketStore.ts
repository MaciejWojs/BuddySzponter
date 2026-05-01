import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useWebRtcStore } from './webRtcStore'
import { useConnectionStore } from './connectionStore'
import { wsService } from '@renderer/composables/connection/webSocketService'
import { WsRequestAccess } from '@shared/schemas/ws'
import { WsActionResponse, WsConnectResponse } from '@shared/schemas/ipc'
import { useSignalingStore } from './signalingStore'

export const useSocketStore = defineStore('socket', () => {
  const RECONNECT_MAX_ATTEMPTS = 4
  const RECONNECT_BASE_DELAY_MS = 1000

  const isConnected = ref(false)
  const incomingRequest = ref<WsRequestAccess | null>(null)
  const isAcknowledged = ref(false)
  const isReconnecting = ref(false)
  const isAccessRejected = ref(false)
  const isInitialized = ref(false)

  let lastConnectionToken: string | null = null
  let isDisconnectingLocally = false

  const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))
  let pendingOfferSdp: string | null = null
  let isGuestWindowReady = false
  let relayChannel: BroadcastChannel | null = null

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
      await wait(RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1))
    }

    isReconnecting.value = false
    return false
  }

  const init = (): void => {
    if (isInitialized.value) return
    isInitialized.value = true

    const rtcStore = useWebRtcStore()
    const connectionStore = useConnectionStore()
    const signalingStore = useSignalingStore()

    if (!relayChannel) {
      relayChannel = new BroadcastChannel('guest-sync-channel')

      relayChannel.onmessage = (event) => {
        if (event.data.type === 'GUEST_READY') {
          isGuestWindowReady = true
          if (pendingOfferSdp) {
            console.log('[SocketStore] Okno Gościa gotowe, przesyłam zmagazynowaną Ofertę!')
            relayChannel?.postMessage({ type: 'RELAY_OFFER', payload: pendingOfferSdp })
            pendingOfferSdp = null
          } else {
            console.log('[SocketStore] Okno Gościa gotowe przed Ofertą. Czekam na Hosta...')
          }
        } else if (event.data.type === 'RELAY_ANSWER') {
          wsService.sendAnswer({ sdp: event.data.payload })
        } else if (event.data.type === 'RELAY_ICE') {
          wsService.sendIceCandidate({ candidate: JSON.stringify(event.data.payload) })
        }
      }
    }

    wsService.setupConnection({
      onConnected: () => {
        isConnected.value = true
      },
      onDisconnected: async () => {
        // Jeśli sami wywołaliśmy disconnect, ignorujemy ten event
        if (isDisconnectingLocally) return

        console.log('[SocketStore] Wykryto rozłączenie gniazda.')
        isConnected.value = false

        // Jeśli sesja trwała (WebRTC), próbujemy ją uratować (reconnect)
        if (isAcknowledged.value) {
          const reconnected = await tryReconnect()
          if (reconnected) return
        }

        isAcknowledged.value = false
        rtcStore.forceDisconnect()
        connectionStore.resetState()
      },
      onManualDisconnected: () => {
        // TO BYŁ SPRAWCA: Całkowicie ignorujemy wymuszone rozłączenia z IPC
        // podczas trwania sesji, aby zapobiec "duchom" ze starych sesji.
        console.log(
          '[SocketStore] Sygnał manual-disconnect z IPC zignorowany dla stabilności sesji.'
        )
      },
      onConnectError: (err) => console.error('[SocketStore]', err.message)
    })

    wsService.setupAccess({
      onRequest: (data) => {
        incomingRequest.value = data
      },
      onAccepted: () => {
        isAcknowledged.value = true
        incomingRequest.value = null

        if (!connectionStore.isHost && window.api?.app?.openGuestWindow) {
          window.api.app.openGuestWindow(data.sessionId)
        }
      },
      onRejected: () => {
        resetLocalState(true)
        isAccessRejected.value = true
        const connectionStore = useConnectionStore()
        connectionStore.handleAccessRejected()
      },
      onError: (err) => console.error('[SocketStore]', err.message)
    })

    wsService.setupHandshake({
      onAcknowledged: () => {
        isAcknowledged.value = true
        incomingRequest.value = null
        if (connectionStore.isHost && rtcStore.localStream) {
          signalingStore.startConnectionAsHost()
        }
      }
    })

    wsService.setupWebRtc({
      onOffer: (data) => {
        if (connectionStore.isHost) {
          signalingStore.handleOffer()
        } else {
          signalingStore.handleOffer()
          if (isGuestWindowReady) {
            console.log('[SocketStore] Oferta od Hosta dotarła, Okno Gościa czeka. Przesyłam!')
            relayChannel?.postMessage({ type: 'RELAY_OFFER', payload: data.sdp })
          } else {
            console.log('[SocketStore] Zamrażam Ofertę Hosta, czekając na załadowanie Okna Gościa.')
            pendingOfferSdp = data.sdp
          }
        }
      },
      onAnswer: (data) => signalingStore.handleAnswer(data),
      onIceCandidate: (data) => {
        if (connectionStore.isHost) {
          signalingStore.handleCandidate(data)
        } else {
          relayChannel?.postMessage({ type: 'RELAY_HOST_ICE', payload: data })
        }
      },
      onReady: () => console.log('[SocketStore] P2P Ready!')
    })
  }

  const resetLocalState = (preserveRejected = false): void => {
    incomingRequest.value = null
    isAcknowledged.value = false
    if (!preserveRejected) isAccessRejected.value = false
    pendingOfferSdp = null
    isGuestWindowReady = false
  }

  const connect = async (token: string): Promise<WsConnectResponse> => {
    lastConnectionToken = token
    resetLocalState()
    return await wsService.connect(token)
  }

  const disconnect = async (): Promise<WsActionResponse> => {
    if (isDisconnectingLocally) return { success: true }

    isDisconnectingLocally = true
    lastConnectionToken = null
    isConnected.value = false
    resetLocalState(true)

    isAcknowledged.value = false

    const rtcStore = useWebRtcStore()
    try {
      await rtcStore.disconnect()
    } catch (e) {
      console.error('[SocketStore] Błąd podczas rozłączania WebRTC:', e)
    }

    const res = await wsService.disconnect()
    isDisconnectingLocally = false
    return res
  }

  const respondToRequest = async (accept: boolean): Promise<void> => {
    if (accept) {
      await wsService.respondAccept()
    } else {
      await wsService.respondReject()
      const connectionStore = useConnectionStore()
      await connectionStore.handleAccessRejected()
    }
    incomingRequest.value = null
  }

  return {
    isConnected,
    incomingRequest,
    isAcknowledged,
    isReconnecting,
    isAccessRejected,
    isInitialized,
    wsService,
    init,
    connect,
    disconnect,
    respondToRequest
  }
})
