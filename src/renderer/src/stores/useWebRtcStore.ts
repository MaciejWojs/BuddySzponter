import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSocketStore } from './useSocketStore'
import { webRtcService } from '@renderer/composables/connection/WebRTCService'
import { P2PMessage } from '@renderer/schemas/p2pProtocol'

export const useWebRtcStore = defineStore('webrtc', () => {
  const socketStore = useSocketStore()
  const rtcStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')

  const chatMessages = ref<string[]>([])
  const remoteMouse = ref({ x: 0, y: 0 })

  // ==========================================
  // ODBIORNIK I ROUTER P2P
  // ==========================================
  webRtcService.onMessageReceived = (data: string) => {
    try {
      const msg = JSON.parse(data) as P2PMessage

      // Kierujemy ruch na podstawie typu wiadomości
      switch (msg.type) {
        case 'CHAT':
          chatMessages.value.push(`${msg.payload.sender}: ${msg.payload.text}`)
          break

        case 'MOUSE_MOVE':
          remoteMouse.value = { x: msg.payload.x, y: msg.payload.y }
          break

        case 'CONTROL':
          handleControlCommand(msg.payload.action)
          break
      }
    } catch (e) {
      console.error('[WebRtcStore] Błąd parsowania paczki P2P:', e)
    }
  }

  // Funkcja pomocnicza do trudniejszych komend
  const handleControlCommand = (action: string): void => {
    console.log('[WebRtcStore] Otrzymano komendę systemową:', action)

    if (action === 'PAUSE_VIDEO') {
      // isRemoteVideoPaused.value = true
    } else if (action === 'RESUME_VIDEO') {
      // isRemoteVideoPaused.value = false
    } else if (action === 'LOWER_QUALITY') {
      // Obniż rozdzielczość swojej kamery/ekranu wysyłanej do partnera
    }
  }

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

  // UWAGA: Usunąłem stąd to drugie, zdublowane webRtcService.onMessageReceived!

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
  // AKCJE KANAŁU DANYCH (Wysyłanie) - NAPRAWIONE TYPY
  // ==========================================

  const sendChatMessage = (text: string): void => {
    // Budujemy paczkę zgodnie z nowym protokołem P2PMessage
    const msg: P2PMessage = {
      type: 'CHAT',
      payload: { text, sender: 'Stygus' }
    }
    webRtcService.sendData(JSON.stringify(msg))

    // Dodajemy własną wiadomość do okna czatu
    chatMessages.value.push(`Ja: ${text}`)
  }

  const sendMousePosition = (x: number, y: number): void => {
    // Budujemy paczkę zgodnie z nowym protokołem P2PMessage
    const msg: P2PMessage = {
      type: 'MOUSE_MOVE',
      payload: { x, y }
    }
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
