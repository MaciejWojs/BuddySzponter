// src/renderer/stores/signalingStore.ts
import { defineStore } from 'pinia'
import { watch } from 'vue'
import { useSocketStore } from './socketStore'
import { useWebRtcStore } from './webRtcStore'
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { WsWebRTCOffer, WsWebRTCAnswer, WsWebRTCIceCandidate } from '@shared/schemas/ws'

export const useSignalingStore = defineStore('signaling', () => {
  const socketStore = useSocketStore()
  const webRtcStore = useWebRtcStore()

  const startConnectionAsHost = async (): Promise<void> => {
    webRtcStore.setLocalPublishProfile('host')
    webRtcService.cleanup()
    webRtcService.initialize(true)

    if (webRtcStore.localStream) {
      webRtcService.publishLocalStream(webRtcStore.localStream, webRtcStore.getCurrentTrackPolicy())
    }

    webRtcStore.rtcStatus = 'connecting'

    try {
      const offer = await webRtcService.createOffer()
      await socketStore.wsService.sendOffer({ sdp: JSON.stringify(offer) })
    } catch (e) {
      console.error('[Signaling] Błąd tworzenia oferty:', e)
      webRtcStore.forceDisconnect()
    }
  }

  const handleOffer = async (data: WsWebRTCOffer): Promise<void> => {
    webRtcStore.setLocalPublishProfile('guest')
    webRtcService.cleanup()
    webRtcService.initialize(false)
    webRtcStore.rtcStatus = 'connecting'

    try {
      const offer = JSON.parse(data.sdp)
      const answer = await webRtcService.handleOfferAndCreateAnswer(
        offer,
        webRtcStore.localStream,
        webRtcStore.getCurrentTrackPolicy()
      )
      await socketStore.wsService.sendAnswer({ sdp: JSON.stringify(answer) })
    } catch (e) {
      console.error('[Signaling] Błąd obsługi oferty:', e)
      webRtcStore.forceDisconnect()
    }
  }

  const handleAnswer = async (data: WsWebRTCAnswer): Promise<void> => {
    try {
      await webRtcService.handleAnswer(JSON.parse(data.sdp))
    } catch (e) {
      console.error('[Signaling] Błąd obsługi odpowiedzi:', e)
    }
  }

  const handleCandidate = async (data: WsWebRTCIceCandidate): Promise<void> => {
    try {
      await webRtcService.addIceCandidate(JSON.parse(data.candidate))
    } catch (e) {
      console.error('[Signaling] Błąd dodawania ICE Candidate:', e)
    }
  }

  webRtcService.onIceCandidateGenerated = async (candidate): Promise<void> => {
    await socketStore.wsService.sendIceCandidate({ candidate: JSON.stringify(candidate) })
  }

  webRtcService.onConnectionFailed = () => {
    console.warn('[Signaling] Połączenie WebRTC uległo awarii (stan failed)!')
    if (webRtcStore.localPublishProfile === 'host' && socketStore.isConnected) {
      console.log('[Signaling] Próbuję nawiązać połączenie WebRTC ponownie (jako Host)...')
      startConnectionAsHost()
    } else if (webRtcStore.localPublishProfile === 'guest') {
      webRtcStore.rtcStatus = 'connecting'
    }
  }

  watch(
    () => webRtcStore.rtcStatus,
    (status) => {
      if (status === 'disconnected' && socketStore.isAcknowledged) {
        console.log('[Signaling] P2P rozłączone, ale sesja aktywna. Automatyczne wznawianie...')
        if (webRtcStore.localPublishProfile === 'host') {
          startConnectionAsHost()
        } else {
          webRtcStore.rtcStatus = 'connecting'
        }
      }
    }
  )

  return {
    startConnectionAsHost,
    handleOffer,
    handleAnswer,
    handleCandidate
  }
})
