import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSocketStore } from './useSocketStore'
import { webRtcService } from '@renderer/composables/connection/WebRTCService'

type PeerMessage = { type: 'chat'; text: string } | { type: 'mouse'; x: number; y: number }

export const useWebRtcStore = defineStore('webrtc', () => {
  const socketStore = useSocketStore()
  const rtcStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')

  const chatMessages = ref<string[]>([])
  const remoteMouse = ref({ x: 0, y: 0 })

  // ==========================================
  // NASŁUCHIWANIE NA SILNIK WEBRTC (Co generuje nasza przeglądarka)
  // ==========================================

  webRtcService.onIceCandidateGenerated = async (candidate) => {
    await socketStore.wsService.webrtcIceCandidate({ candidate: JSON.stringify(candidate) })
  }

  webRtcService.onDataChannelOpened = () => {
    console.log('[WebRtcStore] Stan zmieniony na CONNECTED!')
    rtcStatus.value = 'connected'
  }

  webRtcService.onMessageReceived = (data) => {
    try {
      const payload = JSON.parse(data) as PeerMessage
      if (payload.type === 'chat') {
        chatMessages.value.push(`Rozmówca: ${payload.text}`)
      } else if (payload.type === 'mouse') {
        remoteMouse.value = { x: payload.x, y: payload.y }
      }
    } catch (e) {
      console.error('[WebRtcStore] Błąd parsowania danych:', e)
    }
  }

  // ==========================================
  // NASŁUCHIWANIE NA WEBSOCKET (Sygnały od partnera z serwera)
  // ==========================================

  socketStore.wsService.onWebRTCOffer(async (data) => {
    console.log('[WebRtcStore] Otrzymano Ofertę (Offer) od Hosta!')

    webRtcService.initialize()
    rtcStatus.value = 'connecting'

    const offer = JSON.parse(data.sdp)
    const answer = await webRtcService.handleOfferAndCreateAnswer(offer)

    await socketStore.wsService.webrtcAnswer({ sdp: JSON.stringify(answer) })
  })

  socketStore.wsService.onWebRTCAnswer(async (data) => {
    console.log('[WebRtcStore] Otrzymano Odpowiedź (Answer) od Gościa!')
    const answer = JSON.parse(data.sdp)
    await webRtcService.handleAnswer(answer)
  })

  socketStore.wsService.onWebRTCIceCandidate(async (data) => {
    console.log('[WebRtcStore] Otrzymano kandydata ICE od partnera!')
    const candidate = JSON.parse(data.candidate)
    await webRtcService.addIceCandidate(candidate)
  })

  // ==========================================
  // AKCJE KANAŁU DANYCH (Wysyłanie)
  // ==========================================

  const sendChatMessage = (text: string): void => {
    const msg: PeerMessage = { type: 'chat', text }
    webRtcService.sendData(JSON.stringify(msg))
    chatMessages.value.push(`Ja: ${text}`)
  }

  const sendMousePosition = (x: number, y: number): void => {
    const msg: PeerMessage = { type: 'mouse', x, y }
    webRtcService.sendData(JSON.stringify(msg))
  }

  // ==========================================
  // AKCJE STARTOWE WEBRTC
  // ==========================================

  const startConnectionAsHost = async (): Promise<void> => {
    console.log('[WebRtcStore] Host uruchamia P2P i tworzy ofertę...')
    webRtcService.initialize()
    rtcStatus.value = 'connecting'

    const offer = await webRtcService.createOffer()
    await socketStore.wsService.webrtcOffer({ sdp: JSON.stringify(offer) })
  }

  const disconnect = (): void => {
    webRtcService.cleanup()
    rtcStatus.value = 'disconnected'
    chatMessages.value = []
  }

  return {
    rtcStatus,
    chatMessages,
    remoteMouse,
    sendChatMessage,
    sendMousePosition,
    startConnectionAsHost,
    disconnect
  }
})
