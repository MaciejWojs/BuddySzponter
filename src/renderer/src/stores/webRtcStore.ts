// renderer/src/stores/webRtcStore.ts
import { defineStore } from 'pinia'
import { ref, shallowRef, watch } from 'vue'
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
import { videoService } from '@renderer/composables/video/videoService'

export const useWebRtcStore = defineStore('webrtc', () => {
  const getSocketStore = (): ReturnType<typeof useSocketStore> => useSocketStore()

  const rtcStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const localStream = shallowRef<MediaStream | null>(null)
  const remoteStream = shallowRef<MediaStream | null>(null)
  const localPublishProfile = ref<'host' | 'guest'>('host')

  // Recording state
  const isRecording = ref<boolean>(false)

  // Kontrolki głośności
  const remoteMicVolume = ref<number>(1)
  const remoteSystemVolume = ref<number>(1)
  const localSystemAudioVolume = ref<number>(1)
  const localMicrophoneVolume = ref<number>(1)

  const audioDuckingLevel = ref<number>(0.3)
  const audioSpeechThreshold = ref<number>(0.02)
  const audioGainSmoothing = ref<number>(0.08)
  const audioHoldFrames = ref<number>(8)

  watch(localSystemAudioVolume, (val): void => videoService.setSystemAudioVolume(val))
  watch(localMicrophoneVolume, (val): void => videoService.setMicrophoneVolume(val))

  const connectionMetrics = useConnectionMetrics(rtcStatus)
  const chat = ChatChannel()
  const hid = HidChannel()
  const system = SystemEventsChannel((): void => forceDisconnect())

  const getCurrentTrackPolicy = (): typeof hostTrackPolicy => {
    return localPublishProfile.value === 'guest' ? guestTrackPolicy : hostTrackPolicy
  }

  // --- OBSŁUGA POŁĄCZENIA ---

  const startConnectionAsHost = async (): Promise<void> => {
    localPublishProfile.value = 'host'
    webRtcService.cleanup()
    webRtcService.initialize(true)
    if (localStream.value)
      webRtcService.publishLocalStream(localStream.value, getCurrentTrackPolicy())

    rtcStatus.value = 'connecting'
    const offer = await webRtcService.createOffer()
    await getSocketStore().wsService.sendOffer({ sdp: JSON.stringify(offer) })
  }

  const handleOffer = async (data: WsWebRTCOffer): Promise<void> => {
    webRtcService.cleanup()
    webRtcService.initialize(false)
    rtcStatus.value = 'connecting'

    const offer = JSON.parse(data.sdp)
    const answer = await webRtcService.handleOfferAndCreateAnswer(
      offer,
      localStream.value,
      getCurrentTrackPolicy()
    )
    await getSocketStore().wsService.sendAnswer({ sdp: JSON.stringify(answer) })
  }

  const handleAnswer = async (data: WsWebRTCAnswer): Promise<void> => {
    await webRtcService.handleAnswer(JSON.parse(data.sdp))
  }

  const handleCandidate = async (data: WsWebRTCIceCandidate): Promise<void> => {
    await webRtcService.addIceCandidate(JSON.parse(data.candidate))
  }

  const publishLocalStream = async (stream: MediaStream): Promise<void> => {
    localStream.value = stream
    if (rtcStatus.value === 'disconnected') return

    // Nie musimy robić re-negocjacji! Transceivery są stałe.
    webRtcService.publishLocalStream(stream, getCurrentTrackPolicy())
  }

  // --- LISTENERS ---

  webRtcService.onIceCandidateGenerated = async (candidate): Promise<void> => {
    await getSocketStore().wsService.sendIceCandidate({ candidate: JSON.stringify(candidate) })
  }

  webRtcService.onMessageReceived = (data: string, channelLabel: string): void => {
    try {
      const msg = JSON.parse(data)
      if (channelLabel === 'chat-channel' && msg.type === 'CHAT')
        chat.handleIncomingMessage(msg.payload)
      if (channelLabel === 'hid-control' && msg.type === 'MOUSE_MOVE')
        hid.handleIncomingMessage(msg.payload)
      if (channelLabel === 'system-events') system.handleIncomingMessage(msg)
      if (channelLabel === 'metrics' && msg.type === 'METRICS')
        connectionMetrics.applyRemoteMetrics(msg.payload)
    } catch (e) {
      console.error('[WebRtcStore] Error:', e)
    }
  }

  webRtcService.onRemoteStreamReceived = (stream): void => {
    remoteStream.value = stream
  }

  webRtcService.onDataChannelOpened = (): void => {
    rtcStatus.value = 'connected'
    connectionMetrics.start()
  }

  // --- UTILS ---

  const forceDisconnect = (): void => {
    connectionMetrics.stop()
    rtcStatus.value = 'disconnected'
    webRtcService.cleanup()
    remoteStream.value = null
    localPublishProfile.value = 'host'

    // Zatrzymanie strumienia sprzętowego jeśli działa (dobra praktyka w Electron)
    if (localStream.value) {
      localStream.value.getTracks().forEach((t) => t.stop())
      localStream.value = null
    }

    if (isRecording.value) {
      webRtcService.stopRecording()
      isRecording.value = false
    }
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

  const getRemoteTrackRole = (trackId: string): string | null =>
    webRtcService.getRemoteTrackRole(trackId)

  const setLocalPreviewFps = (fps: number | null): void => {
    connectionMetrics.setLocalPreviewFps(fps)
  }

  const setLocalPreviewQuality = (quality: 'low' | 'medium' | 'high' | null): void => {
    connectionMetrics.setLocalPreviewQuality(quality)
  }

  const resolveLocalAudioTracks = (
    audioTracks: MediaStreamTrack[]
  ): { micTrack: MediaStreamTrack | null; systemTrack: MediaStreamTrack | null } => {
    if (audioTracks.length === 0) return { micTrack: null, systemTrack: null }

    // 1. Zbieramy mocne poszlaki
    const hintedMic = audioTracks.find((t) => t.contentHint === 'speech')
    const hintedSystem = audioTracks.find((t) => t.contentHint === 'music')
    const monoTrack = audioTracks.find((t) => t.getSettings().channelCount === 1)
    const stereoTrack = audioTracks.find((t) => t.getSettings().channelCount === 2)

    // 2. Bezpieczne przypisanie na podstawie poszlak
    let micTrack: MediaStreamTrack | null = hintedMic ?? monoTrack ?? null
    let systemTrack: MediaStreamTrack | null = hintedSystem ?? stereoTrack ?? null

    // Zabezpieczenie: jeśli z jakiegoś powodu obie heurystyki wskazały ten sam track
    if (micTrack && systemTrack && micTrack.id === systemTrack.id) {
      systemTrack = null
    }

    // 3. Fallbacki "ostateczne" (jeśli brakuje poszlak)
    if (!micTrack) {
      micTrack = audioTracks[0] // Bierzemy pierwszy lepszy jako mikrofon
    }

    if (!systemTrack) {
      // Szukamy czegokolwiek, co NIE JEST przypisanym już mikrofonem
      systemTrack = audioTracks.find((t) => t.id !== micTrack?.id) ?? null
    }

    return { micTrack, systemTrack }
  }

  const toggleMicrophone = (isMuted: boolean): void => {
    if (!localStream.value) return
    const audioTracks = localStream.value.getAudioTracks()
    const { micTrack } = resolveLocalAudioTracks(audioTracks)
    if (micTrack) micTrack.enabled = !isMuted
  }

  const toggleSystemAudio = (isMuted: boolean): void => {
    if (!localStream.value) return
    const audioTracks = localStream.value.getAudioTracks()
    const { systemTrack } = resolveLocalAudioTracks(audioTracks)

    if (!systemTrack) {
      console.warn(
        '[WebRtcStore] Nie znaleziono dedykowanej sciezki audio systemu do przełączenia.'
      )
      return
    }

    systemTrack.enabled = !isMuted
  }

  const toggleScreenVideo = (isHidden: boolean): void => {
    if (!localStream.value) return
    const videoTrack = localStream.value.getVideoTracks()[0]
    if (videoTrack) videoTrack.enabled = !isHidden
  }

  const startRecording = (): void => {
    if (!remoteStream.value) {
      console.warn('[WebRtcStore] brak remoteStream')
      return
    }

    webRtcService.startRecording()
    isRecording.value = true
  }

  const stopRecording = (): void => {
    webRtcService.stopRecording()
    isRecording.value = false
  }

  webRtcService.onRecordingReady = async (blob) => {
    const buffer = await blob.arrayBuffer()
    await window.recorder.saveFile(buffer)
  }

  return {
    rtcStatus,
    localStream,
    remoteStream,
    localPublishProfile,
    remoteMicVolume,
    remoteSystemVolume,
    localSystemAudioVolume,
    localMicrophoneVolume,
    chatMessages: chat.chatMessages,
    remoteMouse: hid.remoteMouse,
    localMetrics: connectionMetrics.localMetrics,
    remoteMetrics: connectionMetrics.remoteMetrics,
    sendChatMessage: chat.sendChatMessage,
    sendMousePosition: hid.sendMousePosition,
    sendVideoCommand: system.sendVideoCommand,
    toggleMicrophone,
    toggleSystemAudio,
    toggleScreenVideo,
    setLocalPublishProfile,
    getRemoteTrackRole,
    setLocalPreviewFps,
    setLocalPreviewQuality,
    handleOffer,
    handleAnswer,
    handleCandidate,
    startConnectionAsHost,
    disconnect,
    forceDisconnect,
    publishLocalStream,
    startRecording,
    stopRecording,
    audioDuckingLevel,
    audioSpeechThreshold,
    audioGainSmoothing,
    audioHoldFrames
  }
})
