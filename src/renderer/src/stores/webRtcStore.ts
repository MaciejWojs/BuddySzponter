// renderer/src/stores/webRtcStore.ts

import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { useSocketStore } from './socketStore'
import {
  guestTrackPolicy,
  hostTrackPolicy,
  webRtcService
} from '@renderer/composables/connection/webRTCService'
import { useConnectionMetrics } from '@renderer/composables/connection/useConnectionMetrics'
import { WsWebRTCOffer, WsWebRTCAnswer, WsWebRTCIceCandidate } from '@shared/schemas/ws'
import { ChatChannel } from '@renderer/composables/channels/ChatChannel'
import { HidChannel } from '@renderer/composables/channels/HidChannel'
import { SystemEventsChannel } from '@renderer/composables/channels/SystemEventsChannel'

export const useWebRtcStore = defineStore('webrtc', () => {
  const getSocketStore = (): ReturnType<typeof useSocketStore> => useSocketStore()

  const rtcStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')

  const localStream = shallowRef<MediaStream | null>(null)
  const remoteStream = shallowRef<MediaStream | null>(null)
  const localPublishProfile = ref<'host' | 'guest'>('host')

  const connectionMetrics = useConnectionMetrics(rtcStatus)
  const chat = ChatChannel()
  const hid = HidChannel()
  const system = SystemEventsChannel(() => forceDisconnect())

  const getCurrentTrackPolicy = (): typeof hostTrackPolicy => {
    return localPublishProfile.value === 'guest' ? guestTrackPolicy : hostTrackPolicy
  }

  const handleOffer = async (data: WsWebRTCOffer): Promise<void> => {
    webRtcService.initialize()
    rtcStatus.value = 'connecting'
    if (localStream.value)
      webRtcService.publishLocalStream(localStream.value, getCurrentTrackPolicy())

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
      const msg = JSON.parse(data)

      switch (channelLabel) {
        case 'chat-channel':
          if (msg.type === 'CHAT') chat.handleIncomingMessage(msg.payload)
          break
        case 'hid-control':
          if (msg.type === 'MOUSE_MOVE') hid.handleIncomingMessage(msg.payload)
          break
        case 'system-events':
          system.handleIncomingMessage(msg.payload)
          break
        case 'metrics':
          if (msg.type === 'METRICS') connectionMetrics.applyRemoteMetrics(msg.payload)
          break
      }
    } catch (e) {
      console.error('[WebRtcStore] Błąd parsowania P2P:', e)
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
    localPublishProfile.value = 'host'
    webRtcService.cleanup()
    webRtcService.initialize()
    if (localStream.value)
      webRtcService.publishLocalStream(localStream.value, getCurrentTrackPolicy())
    rtcStatus.value = 'connecting'

    const offer = await webRtcService.createOffer()
    await getSocketStore().wsService.sendOffer({ sdp: JSON.stringify(offer) })
  }

  const forceDisconnect = (): void => {
    connectionMetrics.stop()
    rtcStatus.value = 'disconnected'
    webRtcService.cleanup()
    remoteStream.value = null
    hid.remoteMouse.value = { x: 0, y: 0 }
    localPublishProfile.value = 'host'
    connectionMetrics.reset()
  }

  const disconnect = async (): Promise<void> => {
    if (rtcStatus.value === 'disconnected') return

    system.sendDisconnectEvent()
    forceDisconnect()
  }

  const setLocalPublishProfile = (profile: 'host' | 'guest'): void => {
    localPublishProfile.value = profile

    if (rtcStatus.value !== 'disconnected' && localStream.value) {
      webRtcService.publishLocalStream(localStream.value, getCurrentTrackPolicy())
    }
  }

  const publishLocalStream = async (stream: MediaStream): Promise<void> => {
    localStream.value = stream
    if (rtcStatus.value === 'disconnected') return

    try {
      webRtcService.publishLocalStream(stream, getCurrentTrackPolicy())

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
    localStream,
    remoteStream,
    localPublishProfile,

    chatMessages: chat.chatMessages,
    remoteMouse: hid.remoteMouse,
    localMetrics: connectionMetrics.localMetrics,
    remoteMetrics: connectionMetrics.remoteMetrics,

    sendChatMessage: chat.sendChatMessage,
    sendMousePosition: hid.sendMousePosition,
    sendVideoCommand: system.sendVideoCommand,

    handleOffer,
    handleAnswer,
    handleCandidate,
    startConnectionAsHost,
    disconnect,
    forceDisconnect,
    setLocalPublishProfile,
    publishLocalStream,
    setLocalPreviewFps,
    setLocalPreviewQuality
  }
})
