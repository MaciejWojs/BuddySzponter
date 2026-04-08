import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { useSocketStore } from './socketStore'
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { P2PMessage } from '@renderer/schemas/p2pProtocol'
import { useConnectionStore } from './connectionStore'

// KROK 1: Definiujemy typ dla ekranów, żeby pozbyć się "any"
export interface DesktopSource {
  id: string
  name: string
  thumbnail: string
}

export const useWebRtcStore = defineStore('webrtc', () => {
  const socketStore = useSocketStore()
  const rtcStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')

  // ==========================================
  // --- STAN DANYCH (Czat, Myszka, Wideo) ---
  // ==========================================
  const chatMessages = ref<string[]>([])
  const remoteMouse = ref({ x: 0, y: 0 })

  // Wideo - używamy shallowRef, aby Vue nie próbowało robić MediaStreamu głęboko reaktywnym!
  const availableScreens = ref<DesktopSource[]>([])
  const localStream = shallowRef<MediaStream | null>(null)
  const remoteStream = shallowRef<MediaStream | null>(null)

  // ==========================================
  // ODBIORNIK I ROUTER P2P (DataChannel)
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

        case 'DISCONNECT':
          console.log('[WebRtcStore] Otrzymano sygnał DISCONNECT od partnera. Zamykam połączenie.')
          forceDisconnect()
          break
      }
    } catch (e) {
      console.error('[WebRtcStore] Błąd parsowania paczki P2P:', e)
    }
  }

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
  // NASŁUCHIWANIE NA SILNIK WEBRTC
  // ==========================================

  webRtcService.onIceCandidateGenerated = async (candidate) => {
    await socketStore.wsService.webrtcIceCandidate({ candidate: JSON.stringify(candidate) })
  }

  webRtcService.onDataChannelOpened = () => {
    console.log('[WebRtcStore] Kanały Danych (DataChannel) gotowe - CONNECTED!')
    rtcStatus.value = 'connected'
  }

  webRtcService.onRemoteStreamReceived = (stream) => {
    console.log('[WebRtcStore] Otrzymano zdalny strumień wideo od partnera!')
    remoteStream.value = stream
  }

  webRtcService.onConnectionFailed = () => {
    console.error('[WebRtcStore] ZERWANO POŁĄCZENIE P2P! Próba wznowienia...')

    // Zmieniamy status, żeby UI pokazało np. żółtą kropkę "Łączenie..."
    rtcStatus.value = 'connecting'

    // Zamykamy tylko stare połączenie P2P, ale NIE czyścimy localStream!
    webRtcService.cleanup()

    if (useConnectionStore().isHost) {
      console.log('[WebRtcStore] Jestem Hostem. Próbuję ponownie nawiązać sesję za 3 sekundy...')

      setTimeout(async () => {
        if (!socketStore.isConnected) {
          console.error('[WebRtcStore] Brak gniazdka WS. Wznawianie P2P anulowane.')
          forceDisconnect()
          return
        }

        try {
          webRtcService.initialize()

          if (localStream.value) {
            webRtcService.addLocalStream(localStream.value)
          }

          const offer = await webRtcService.createOffer()
          await socketStore.wsService.webrtcOffer({ sdp: JSON.stringify(offer) })
          console.log('[WebRtcStore] Wysłano nową ofertę wznawiającą.')
        } catch (error) {
          console.error('[WebRtcStore] Nie udało się wznowić:', error)
          forceDisconnect()
        }
      }, 3000)
    }
  }

  webRtcService.onConnectionClosed = () => {
    console.log('[WebRtcStore] Połączenie WebRTC zostało zamknięte przez serwis.')
    forceDisconnect()
  }

  // ==========================================
  // NASŁUCHIWANIE NA WEBSOCKET (Sygnalizacja)
  // ==========================================

  socketStore.wsService.onWebRTCOffer(async (data) => {
    console.log('[WebRtcStore] Otrzymano Ofertę (Offer) od Hosta!')

    webRtcService.initialize()
    rtcStatus.value = 'connecting'

    if (localStream.value) {
      webRtcService.addLocalStream(localStream.value)
    }

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
    const msg: P2PMessage = {
      type: 'CHAT',
      payload: { text, sender: 'Stygus' }
    }
    webRtcService.chatChannel?.send(JSON.stringify(msg))
    chatMessages.value.push(`Ja: ${text}`)
  }

  const sendMousePosition = (x: number, y: number): void => {
    const msg: P2PMessage = {
      type: 'MOUSE_MOVE',
      payload: { x, y }
    }
    webRtcService.mouseChannel?.send(JSON.stringify(msg))
  }

  // ==========================================
  // AKCJE ZAMYKANIA POŁĄCZENIA
  // ==========================================

  const disconnect = async (): Promise<void> => {
    if (rtcStatus.value === 'disconnected') return

    console.log('[WebRtcStore] Wysyłanie sygnału rozłączenia dedykowanym kanałem kontrolnym...')

    try {
      const msg: P2PMessage = { type: 'DISCONNECT', payload: {} }

      if (webRtcService.controlChannel?.readyState === 'open') {
        webRtcService.controlChannel.send(JSON.stringify(msg))
      }
    } catch (e) {
      console.warn('[WebRtcStore] Nie udało się wysłać sygnału:', e)
    }

    await new Promise((resolve) => setTimeout(resolve, 200))

    forceDisconnect()
  }

  const forceDisconnect = (): void => {
    if (rtcStatus.value === 'disconnected') return

    console.log('[WebRtcStore] Czyszczenie stanu sesji...')
    webRtcService.cleanup()
    rtcStatus.value = 'disconnected'
    chatMessages.value = []

    if (localStream.value) {
      localStream.value.getTracks().forEach((track) => track.stop())
      localStream.value = null
    }
    remoteStream.value = null
  }

  // ==========================================
  // DYNAMICZNE WSTRZYKIWANIE WIDEO
  // ==========================================
  const publishLocalStream = async (stream: MediaStream): Promise<void> => {
    localStream.value = stream

    if (rtcStatus.value === 'disconnected') return

    try {
      console.log('[WebRtcStore] Wstrzykiwanie nowego strumienia do aktywnego połączenia...')

      webRtcService.addLocalStream(stream)

      if (rtcStatus.value === 'connected') {
        const offer = await webRtcService.createOffer()
        await socketStore.wsService.webrtcOffer({ sdp: JSON.stringify(offer) })
      }
    } catch (e) {
      console.error('[WebRtcStore] Błąd podczas dynamicznego dodawania strumienia:', e)
    }
  }

  // ==========================================
  // AKCJE STARTOWE WEBRTC
  // ==========================================

  const fetchScreens = async (): Promise<void> => {
    try {
      availableScreens.value = await window.api.desktop.getSources()
    } catch (e) {
      console.error('[WebRtcStore] Błąd pobierania ekranów:', e)
    }
  }

  const startConnectionAsHost = async (): Promise<void> => {
    webRtcService.cleanup()
    webRtcService.initialize()

    if (localStream.value) {
      webRtcService.addLocalStream(localStream.value)
    }

    rtcStatus.value = 'connecting'

    const offer = await webRtcService.createOffer()
    await socketStore.wsService.webrtcOffer({ sdp: JSON.stringify(offer) })
  }

  return {
    rtcStatus,
    chatMessages,
    remoteMouse,
    availableScreens,
    localStream,
    remoteStream,
    fetchScreens,
    sendChatMessage,
    sendMousePosition,
    startConnectionAsHost,
    disconnect,
    publishLocalStream
  }
})
