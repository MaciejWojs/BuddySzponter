// renderer/src/stores/webRtcStore.ts

import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { useSocketStore } from './socketStore'
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { useConnectionMetrics } from '@renderer/composables/connection/useConnectionMetrics'
import { P2PMessage } from '@renderer/schemas/p2pProtocol'
import { WsWebRTCOffer, WsWebRTCAnswer, WsWebRTCIceCandidate } from '@shared/schemas/ws'

export const useWebRtcStore = defineStore('webrtc', () => {
  const getSocketStore = (): typeof getSocketStore => useSocketStore()

  const rtcStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const connectionMetrics = useConnectionMetrics(rtcStatus)

  const chatMessages = ref<string[]>([])
  const remoteMouse = ref({ x: 0, y: 0 })
  const { localMetrics, remoteMetrics } = connectionMetrics

  const localStream = shallowRef<MediaStream | null>(null)
  const remoteStream = shallowRef<MediaStream | null>(null)

  const handleOffer = async (data: WsWebRTCOffer): Promise<void> => {
    webRtcService.initialize()
    rtcStatus.value = 'connecting'
    if (localStream.value) webRtcService.addLocalStream(localStream.value)

    const offer = JSON.parse(data.sdp)
    const answer = await webRtcService.handleOfferAndCreateAnswer(offer)
    await getSocketStore().wsService.sendAnswer({ sdp: JSON.stringify(answer) })
  }

  const handleAnswer = async (data: WsWebRTCAnswer): Promise<void> => {
    const answer = JSON.parse(data.sdp)
    await webRtcService.handleAnswer(answer)
  }

  const handleCandidate = async (data: WsWebRTCIceCandidate): Promise<void> => {
    const candidate = JSON.parse(data.candidate)
    await webRtcService.addIceCandidate(candidate)
  }

  // --- LISTENERS ---

  webRtcService.onIceCandidateGenerated = async (candidate) => {
    await getSocketStore().wsService.sendIceCandidate({ candidate: JSON.stringify(candidate) })
  }

  webRtcService.onMessageReceived = (data: string, channelLabel: string) => {
    try {
      const msg = JSON.parse(data) as P2PMessage

      if (connectionMetrics.handleIncoming(msg, channelLabel)) return

      if (msg.type === 'CHAT') chatMessages.value.push(`${msg.payload.sender}: ${msg.payload.text}`)
      if (msg.type === 'MOUSE_MOVE') remoteMouse.value = { x: msg.payload.x, y: msg.payload.y }
      if (msg.type === 'DISCONNECT') forceDisconnect()
    } catch (e) {
      console.error('[WebRtcStore] Nie udało się sparsować wiadomości P2P:', e)
    }
  }

  webRtcService.onRemoteStreamReceived = (stream) => {
    remoteStream.value = stream
  }

  webRtcService.onDataChannelOpened = () => {
    rtcStatus.value = 'connected'
    connectionMetrics.start()
  }

  // --- ACTIONS ---

  const startConnectionAsHost = async (): Promise<void> => {
    webRtcService.cleanup()
    webRtcService.initialize()
    if (localStream.value) webRtcService.addLocalStream(localStream.value)
    rtcStatus.value = 'connecting'

    const offer = await webRtcService.createOffer()
    await getSocketStore().wsService.sendOffer({ sdp: JSON.stringify(offer) })
  }

  const forceDisconnect = (): void => {
    connectionMetrics.stop()
    rtcStatus.value = 'disconnected'
    webRtcService.cleanup()
    remoteStream.value = null
    remoteMouse.value = { x: 0, y: 0 }
    connectionMetrics.reset()
  }

  const disconnect = async (): Promise<void> => {
    if (rtcStatus.value === 'disconnected') return

    webRtcService.sendData('system-events', JSON.stringify({ type: 'DISCONNECT', payload: {} }))

    forceDisconnect()
  }

  const publishLocalStream = async (stream: MediaStream): Promise<void> => {
    localStream.value = stream
    if (rtcStatus.value === 'disconnected') return

    try {
      webRtcService.addLocalStream(stream)

      if (rtcStatus.value === 'connected') {
        const offer = await webRtcService.createOffer()
        await getSocketStore().wsService.sendOffer({ sdp: JSON.stringify(offer) })
      }
    } catch (e) {
      console.error('[WebRtcStore] Błąd publikacji streamu:', e)
    }
  }

  const setLocalPreviewFps = (fps: number | null): void => {
    connectionMetrics.setLocalPreviewFps(fps)
  }

  const setLocalPreviewQuality = (quality: 'low' | 'medium' | 'high' | null): void => {
    connectionMetrics.setLocalPreviewQuality(quality)
  }

  return {
    rtcStatus,
    chatMessages,
    localStream,
    remoteStream,
    remoteMouse,
    localMetrics,
    remoteMetrics,
    handleOffer,
    handleAnswer,
    handleCandidate,
    startConnectionAsHost,
    disconnect,
    forceDisconnect,
    publishLocalStream,
    setLocalPreviewFps,
    setLocalPreviewQuality
  }
})
