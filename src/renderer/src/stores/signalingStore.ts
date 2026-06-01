import { defineStore } from 'pinia'
import { useSocketStore } from './socketStore'
import { useWebRtcStore } from './webRtcStore'
import { useCaptureStore } from './captureStore'
import { useAudioSettingsStore } from './audioSettingsStore'
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { WsWebRTCAnswer, WsWebRTCIceCandidate } from '@shared/schemas/ws'

export const useSignalingStore = defineStore('signaling', () => {
  const socketStore = useSocketStore()
  const webRtcStore = useWebRtcStore()

  let isRemoteDescriptionSet = false
  let pendingIceCandidates: RTCIceCandidateInit[] = []

  const startConnectionAsHost = async (): Promise<void> => {
    const audioStore = useAudioSettingsStore()

    webRtcStore.setLocalPublishProfile('host')
    webRtcService.cleanup(true)
    webRtcService.initialize(true)

    isRemoteDescriptionSet = false
    pendingIceCandidates = []

    if (webRtcStore.localStream) {
      webRtcService.publishLocalStream(webRtcStore.localStream, webRtcStore.getCurrentTrackPolicy())
    }

    webRtcStore.rtcStatus = 'connecting'

    try {
      const offer = await webRtcService.createOffer()
      await socketStore.wsService.sendOffer({ sdp: JSON.stringify(offer) })
      audioStore.microphoneMuted = true
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
    const captureStore = useCaptureStore()
    const audioStore = useAudioSettingsStore()
    audioStore.microphoneMuted = true

    webRtcStore.setLocalPublishProfile('guest')
    webRtcService.cleanup(true)
    webRtcService.initialize(false)

    isRemoteDescriptionSet = false
    pendingIceCandidates = []

    try {
      await captureStore.startGuestCapture()

      webRtcStore.rtcStatus = 'connecting'

      const offer = JSON.parse(offerSdp)
      const answer = await webRtcService.handleOfferAndCreateAnswer(
        offer,
        webRtcStore.localStream,
        webRtcStore.getCurrentTrackPolicy()
      )

      isRemoteDescriptionSet = true
      for (const candidate of pendingIceCandidates) {
        await webRtcService.addIceCandidate(candidate)
      }
      pendingIceCandidates = []

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

      isRemoteDescriptionSet = true
      for (const candidate of pendingIceCandidates) {
        await webRtcService.addIceCandidate(candidate)
      }
      pendingIceCandidates = []
    } catch (e) {
      console.error('[Signaling] Błąd obsługi odpowiedzi:', e)
    }
  }

  const handleCandidate = async (data: WsWebRTCIceCandidate): Promise<void> => {
    try {
      const candidate = JSON.parse(data.candidate)

      if (!isRemoteDescriptionSet) {
        console.log('[Signaling] WebRTC jeszcze myśli. Kolejkuję pakiet ICE...')
        pendingIceCandidates.push(candidate)
      } else {
        await webRtcService.addIceCandidate(candidate)
      }
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
