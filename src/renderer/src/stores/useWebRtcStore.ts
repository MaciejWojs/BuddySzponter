import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { useSocketStore } from './useSocketStore'
import { webRtcService } from '@renderer/composables/connection/WebRTCService'
import { P2PMessage } from '@renderer/schemas/p2pProtocol'

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
  const availableScreens = ref<DesktopSource[]>([]) // <-- POPRAWKA: Zamiast any[] mamy DesktopSource[]
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

  // Zapisujemy obraz od partnera do zmiennej, żeby wyświetlić w tagu <video> u Gościa
  webRtcService.onRemoteStreamReceived = (stream) => {
    console.log('[WebRtcStore] Otrzymano zdalny strumień wideo od partnera!')
    remoteStream.value = stream
  }

  // ==========================================
  // NASŁUCHIWANIE NA WEBSOCKET (Sygnalizacja)
  // ==========================================

  socketStore.wsService.onWebRTCOffer(async (data) => {
    console.log('[WebRtcStore] Otrzymano Ofertę (Offer) od Hosta!')

    webRtcService.initialize()
    rtcStatus.value = 'connecting'

    // KRYTYCZNE: Jeśli Gość też coś udostępnia, podpinamy to przed Answer
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
    webRtcService.systemChannel?.send(JSON.stringify(msg))
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
  // AKCJE STARTOWE I KOŃCOWE WEBRTC
  // ==========================================

  // KROK 2: Dodajemy explicite typ zwracany "Promise<void>"
  const fetchScreens = async (): Promise<void> => {
    try {
      // KROK 3: Wyjaśniamy dlaczego ignorujemy (obiekt dodany w locie przez contextBridge)
      // @ts-ignore: window.api is injected via Electron preload script and might lack strict types here
      availableScreens.value = await window.api.desktop.getSources()
    } catch (e) {
      console.error('[WebRtcStore] Błąd pobierania ekranów:', e)
    }
  }

  const startConnectionAsHost = async (): Promise<void> => {
    console.log('[WebRtcStore] Host uruchamia P2P i tworzy ofertę...')
    webRtcService.initialize()

    // KRYTYCZNE: Zanim Host wygeneruje ofertę, musi wpiąć swój ekran z C++ Addona!
    if (localStream.value) {
      webRtcService.addLocalStream(localStream.value)
    }

    rtcStatus.value = 'connecting'

    const offer = await webRtcService.createOffer()
    await socketStore.wsService.webrtcOffer({ sdp: JSON.stringify(offer) })
  }

  const disconnect = (): void => {
    webRtcService.cleanup()
    rtcStatus.value = 'disconnected'
    chatMessages.value = []

    // Zatrzymujemy wideo
    if (localStream.value) {
      localStream.value.getTracks().forEach((track) => track.stop())
      localStream.value = null
    }
    remoteStream.value = null
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
    disconnect
  }
})
