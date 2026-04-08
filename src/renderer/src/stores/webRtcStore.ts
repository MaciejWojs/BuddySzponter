import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { useSocketStore } from './socketStore'
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { P2PMessage } from '@renderer/schemas/p2pProtocol'
import { useConnectionStore } from './connectionStore'

export interface DesktopSource {
  id: string
  name: string
  thumbnail: string
}

export const useWebRtcStore = defineStore('webrtc', () => {
  const socketStore = useSocketStore()
  const rtcStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')

  // --- STATE ---
  const chatMessages = ref<string[]>([])
  const remoteMouse = ref({ x: 0, y: 0 })
  const availableScreens = ref<DesktopSource[]>([])

  const localStream = shallowRef<MediaStream | null>(null)
  const remoteStream = shallowRef<MediaStream | null>(null)

  // --- LISTENERS P2P ---

  webRtcService.onMessageReceived = (data: string) => {
    try {
      const msg = JSON.parse(data) as P2PMessage
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
          console.log('[WebRtcStore] Partner rozłączył się (Sygnał DISCONNECT).')
          forceDisconnect()
          break
      }
    } catch (e) {
      console.error('[WebRtcStore] Błąd parsowania paczki P2P:', e)
    }
  }

  const handleControlCommand = (action: string): void => {
    console.log('[WebRtcStore] Komenda systemowa:', action)
  }

  webRtcService.onIceCandidateGenerated = async (candidate) => {
    await socketStore.wsService.webrtcIceCandidate({ candidate: JSON.stringify(candidate) })
  }

  webRtcService.onDataChannelOpened = () => {
    console.log('[WebRtcStore] P2P połączone!')
    rtcStatus.value = 'connected'
  }

  webRtcService.onRemoteStreamReceived = (stream) => {
    console.log('[WebRtcStore] Otrzymano zdalny strumień.')
    remoteStream.value = stream
  }

  webRtcService.onConnectionFailed = () => {
    console.error('[WebRtcStore] Awaria P2P! Próba wznowienia...')
    rtcStatus.value = 'connecting'
    webRtcService.cleanup()

    if (useConnectionStore().isHost) {
      setTimeout(async () => {
        if (!socketStore.isConnected) {
          forceDisconnect()
          return
        }
        try {
          webRtcService.initialize()
          if (localStream.value) webRtcService.addLocalStream(localStream.value)
          const offer = await webRtcService.createOffer()
          await socketStore.wsService.webrtcOffer({ sdp: JSON.stringify(offer) })
        } catch {
          forceDisconnect()
        }
      }, 3000)
    }
  }

  webRtcService.onConnectionClosed = () => {
    console.log('[WebRtcStore] Serwis WebRTC zgłasza zamknięcie.')
    forceDisconnect()
  }

  // --- WEBSOCKET LISTENERS ---

  socketStore.wsService.onWebRTCOffer(async (data) => {
    webRtcService.initialize()
    rtcStatus.value = 'connecting'
    if (localStream.value) webRtcService.addLocalStream(localStream.value)
    const offer = JSON.parse(data.sdp)
    const answer = await webRtcService.handleOfferAndCreateAnswer(offer)
    await socketStore.wsService.webrtcAnswer({ sdp: JSON.stringify(answer) })
  })

  socketStore.wsService.onWebRTCAnswer(async (data) => {
    const answer = JSON.parse(data.sdp)
    await webRtcService.handleAnswer(answer)
  })

  socketStore.wsService.onWebRTCIceCandidate(async (data) => {
    const candidate = JSON.parse(data.candidate)
    await webRtcService.addIceCandidate(candidate)
  })

  // --- ACTIONS ---

  const sendChatMessage = (text: string): void => {
    const msg: P2PMessage = { type: 'CHAT', payload: { text, sender: 'Stygus' } }
    webRtcService.chatChannel?.send(JSON.stringify(msg))
    chatMessages.value.push(`Ja: ${text}`)
  }

  const sendMousePosition = (x: number, y: number): void => {
    const msg: P2PMessage = { type: 'MOUSE_MOVE', payload: { x, y } }
    webRtcService.mouseChannel?.send(JSON.stringify(msg))
  }

  const disconnect = async (): Promise<void> => {
    if (rtcStatus.value === 'disconnected') return

    console.log('[WebRtcStore] Zamykanie sesji (Graceful Shutdown)...')

    try {
      if (webRtcService.controlChannel?.readyState === 'open') {
        const msg: P2PMessage = { type: 'DISCONNECT', payload: {} }
        webRtcService.controlChannel.send(JSON.stringify(msg))
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    } catch (e) {
      console.warn('[WebRtcStore] Błąd wysyłania DISCONNECT:', e)
    }

    forceDisconnect()
  }

  const forceDisconnect = (): void => {
    if (rtcStatus.value === 'disconnected') return

    console.log('[WebRtcStore] Force Disconnect: czyszczenie zasobów.')
    webRtcService.cleanup()
    rtcStatus.value = 'disconnected'

    if (localStream.value) {
      localStream.value.getTracks().forEach((track) => track.stop())
      localStream.value = null
    }
    remoteStream.value = null
    chatMessages.value = []
  }

  const publishLocalStream = async (stream: MediaStream): Promise<void> => {
    localStream.value = stream
    if (rtcStatus.value === 'disconnected') return

    try {
      webRtcService.addLocalStream(stream)
      if (rtcStatus.value === 'connected') {
        const offer = await webRtcService.createOffer()
        await socketStore.wsService.webrtcOffer({ sdp: JSON.stringify(offer) })
      }
    } catch (e) {
      console.error('[WebRtcStore] Błąd publikacji streamu:', e)
    }
  }

  const startConnectionAsHost = async (): Promise<void> => {
    webRtcService.cleanup()
    webRtcService.initialize()
    if (localStream.value) webRtcService.addLocalStream(localStream.value)
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
    fetchScreens: async () => {
      try {
        availableScreens.value = await window.api.desktop.getSources()
      } catch (e) {
        console.error(e)
      }
    },
    sendChatMessage,
    sendMousePosition,
    startConnectionAsHost,
    disconnect,
    forceDisconnect,
    publishLocalStream
  }
})
