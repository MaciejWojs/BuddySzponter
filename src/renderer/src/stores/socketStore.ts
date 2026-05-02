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
  const isInitialized = ref(false)

  let lastConnectionToken: string | null = null
  let isDisconnectingLocally = false

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

      const delayMs = RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1)
      await wait(delayMs)
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
        isConnected.value = false
        isAcknowledged.value = false

        if (!lastConnectionToken) return

        const reconnected = await tryReconnect()
        if (reconnected) {
          return
        }

        rtcStore.forceDisconnect()
        await connectionStore.restoreDefaultHost()
      },
      onManualDisconnected: async () => {
        console.log('[SocketStore][manual-disconnect] Otrzymano onManualDisconnected z IPC')
        if (isDisconnectingLocally) {
          console.log('[SocketStore][manual-disconnect] Pomijam: lokalne rozłączanie już trwa')
          return
        }

        console.log(
          '[SocketStore][manual-disconnect] Uruchamiam lokalne disconnect() po zdalnym sygnale'
        )
        await disconnect(true)
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

        if (!connectionStore.isHost && window.api?.app?.openGuestWindow) {
          window.api.app.openGuestWindow(data.sessionId)
        }
      },
      onRejected: () => {
        resetLocalState()
        const connStore = useConnectionStore()
        connStore.handleAccessRejected()
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

  const resetLocalState = (): void => {
    incomingRequest.value = null
    isAcknowledged.value = false
    pendingOfferSdp = null
    isGuestWindowReady = false
  }

  const connect = async (token: string): Promise<WsConnectResponse> => {
    lastConnectionToken = token
    resetLocalState()
    return await wsService.connect(token)
  }

  const disconnect = async (restoreHost = true): Promise<WsActionResponse> => {
    if (isDisconnectingLocally) {
      console.log('[SocketStore][manual-disconnect] disconnect() pominięte: już w toku')
      return { success: true }
    }

    console.log('[SocketStore][manual-disconnect] Start disconnect()')
    isDisconnectingLocally = true
    lastConnectionToken = null

    const rtcStore = useWebRtcStore()
    await rtcStore.disconnect()

    const res = await wsService.disconnect()
    isConnected.value = false
    resetLocalState()
    isDisconnectingLocally = false
    console.log(`[SocketStore][manual-disconnect] disconnect() zakończone, success=${res.success}`)

    if (restoreHost) {
      const connectionStore = useConnectionStore()
      await connectionStore.restoreDefaultHost()
    }

    return res
  }

  const respondToRequest = async (accept: boolean): Promise<void> => {
    if (accept) {
      await wsService.respondAccept()
    } else {
      const res = await wsService.respondReject()
      if (res.success) {
        const connectionStore = useConnectionStore()
        await connectionStore.handleAccessRejected()
      }
    }
    incomingRequest.value = null
  }

  return {
    isConnected,
    incomingRequest,
    isAcknowledged,
    isReconnecting,
    isInitialized,
    wsService,
    init,
    connect,
    disconnect,
    respondToRequest
  }
})
