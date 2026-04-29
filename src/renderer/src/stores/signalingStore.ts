// src/renderer/stores/signalingStore.ts
import { defineStore } from 'pinia'
import { useSocketStore } from './socketStore'
import { useWebRtcStore } from './webRtcStore'
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { WsWebRTCAnswer, WsWebRTCIceCandidate } from '@shared/schemas/ws'

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

  const handleOffer = async (): Promise<void> => {
    console.log('[Signaling] Otrzymano ofertę od Hosta. Czekam na przekaźnik...')
    webRtcStore.rtcStatus = 'connecting'
  }

  const createAnswerForRelay = async (offerSdp: string): Promise<string> => {
    webRtcStore.setLocalPublishProfile('guest')
    webRtcService.cleanup()
    webRtcService.initialize(false) // Fałsz, bo to okno Gościa
    webRtcStore.rtcStatus = 'connecting'

    try {
      const offer = JSON.parse(offerSdp)
      // Okno Gościa nie wysyła swojego wideo/audio stąd lokalnego strumienia (null)
      const answer = await webRtcService.handleOfferAndCreateAnswer(
        offer,
        null,
        webRtcStore.getCurrentTrackPolicy()
      )
      return JSON.stringify(answer)
    } catch (e) {
      console.error('[Signaling] Błąd tworzenia odpowiedzi w oknie Gościa:', e)
      webRtcStore.forceDisconnect()
      throw e
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
    if (socketStore.isConnected) {
      await socketStore.wsService.sendIceCandidate({ candidate: JSON.stringify(candidate) })
    }
  }

  return {
    startConnectionAsHost,
    handleOffer,
    createAnswerForRelay,
    handleAnswer,
    handleCandidate
  }
})
