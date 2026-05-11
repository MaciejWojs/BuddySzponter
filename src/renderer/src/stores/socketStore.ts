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
  let connectionEstablished = false
  let lastDisconnectTime = 0

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

    try {
      for (let attempt = 1; attempt <= RECONNECT_MAX_ATTEMPTS; attempt += 1) {
        const res = await wsService.connect(lastConnectionToken)
        if (res.success) {
          return true
        }

        const delayMs = RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1)
        await wait(delayMs)
      }
    } catch (e) {
      console.error('[SocketStore] Błąd w pętli rekonneksji:', e)
    } finally {
      isReconnecting.value = false
    }
    return false
  }

  const killGuestWindow = (): void => {
    if (window.api?.app?.closeGuestWindow) {
      window.api.app.closeGuestWindow().catch(() => {})
    } else if (relayChannel) {
      relayChannel.postMessage({ type: 'HOST_DISCONNECTED' })
    }
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
        connectionEstablished = true
      },
      onDisconnected: async () => {
        if (isDisconnectingLocally) {
          console.log('[SocketStore] Ignoruję onDisconnected, celowe rozłączanie w toku')
          return
        }

        if (isReconnecting.value) {
          console.log('[SocketStore] Ignoruję onDisconnected, rekonneksja w toku')
          return
        }

        isConnected.value = false
        isAcknowledged.value = false

        if (!lastConnectionToken) return

        if (!connectionEstablished) {
          console.warn('[SocketStore] Serwer odrzucił połączenie. Przerywam pętlę odnawiania.')
          lastConnectionToken = null
          connectionStore.resetState()
          return
        }

        const reconnected = await tryReconnect()
        if (reconnected) {
          return
        }

        rtcStore.forceDisconnect()

        killGuestWindow()

        await connectionStore.restoreDefaultHost()
      },
      onManualDisconnected: async () => {
        if (isDisconnectingLocally || Date.now() - lastDisconnectTime < 1000) {
          return
        }

        if (!isConnected.value && !lastConnectionToken) {
          return
        }

        await disconnect(true, true)
      },
      onConnectError: (err) => console.error('[SocketStore]', err.message)
    })

    wsService.setupAccess({
      onRequest: (data) => {
        incomingRequest.value = data
        console.log('[SocketStore] Otrzymano żądanie dostępu:', data)
        if (window.api?.app?.showApp) {
          window.api.app.showApp().catch(() => {})
        }
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
    connectionEstablished = false
    resetLocalState()
    return await wsService.connect(token)
  }

  const disconnect = async (
    restoreHost = true,
    isRemoteSignal = false
  ): Promise<WsActionResponse> => {
    if (isDisconnectingLocally) {
      return { success: true }
    }

    isDisconnectingLocally = true
    lastDisconnectTime = Date.now()
    lastConnectionToken = null

    killGuestWindow()

    const rtcStore = useWebRtcStore()
    try {
      await rtcStore.disconnect()
    } catch (e) {
      console.warn('[SocketStore] Ignoruję błąd rtcStore.disconnect:', e)
    }

    let res: WsActionResponse = { success: true }
    if (!isRemoteSignal) {
      try {
        res = await wsService.disconnect()
      } catch (e) {
        console.warn('[SocketStore] Ignoruję błąd wsService.disconnect:', e)
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100))

    isConnected.value = false
    resetLocalState()

    if (restoreHost) {
      try {
        const connectionStore = useConnectionStore()
        await connectionStore.restoreDefaultHost()
      } catch (e) {
        console.error('[SocketStore] Błąd odtwarzania domyślnego Hosta:', e)
      }
    }

    isDisconnectingLocally = false
    lastDisconnectTime = Date.now()

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
