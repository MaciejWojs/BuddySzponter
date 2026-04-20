// renderer/src/stores/webRtcStore.ts
import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'
import { useSocketStore } from './socketStore'
import {
  guestTrackPolicy,
  hostTrackPolicy,
  webRtcService
} from '@renderer/composables/connection/webRTCService'
import { useConnectionMetrics } from '@renderer/composables/connection/useConnectionMetrics'
import { WsWebRTCOffer, WsWebRTCAnswer, WsWebRTCIceCandidate } from '@shared/schemas/ws'
import { ChatChannel } from '@renderer/composables/channels/ChatChannel'
import { useHidChannel } from '@renderer/composables/channels/HidChannel'
import { SystemEventsChannel } from '@renderer/composables/channels/SystemEventsChannel'

export const useWebRtcStore = defineStore('webrtc', () => {
  const getSocketStore = (): ReturnType<typeof useSocketStore> => useSocketStore()

  const rtcStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const localStream = shallowRef<MediaStream | null>(null)
  const remoteStream = shallowRef<MediaStream | null>(null)
  const localPublishProfile = ref<'host' | 'guest'>('host')

  // Recording state
  const isRecording = ref<boolean>(false)

  // Remote Volume Controls
  const remoteMicVolume = ref<number>(1)
  const remoteSystemVolume = ref<number>(1)

  // Audio Mixer Engine Settings
  const audioDuckingLevel = ref<number>(0.3)
  const audioSpeechThreshold = ref<number>(0.02)
  const audioGainSmoothing = ref<number>(0.08)
  const audioHoldFrames = ref<number>(8)

  const connectionMetrics = useConnectionMetrics(rtcStatus)
  const chat = ChatChannel()
  const hid = useHidChannel()
  const system = SystemEventsChannel((): void => forceDisconnect())

  // HID Control State (Computed directly from the channel)
  const isGuestControlAllowed = computed(() => hid.isControlGranted.value)

  const getCurrentTrackPolicy = (): typeof hostTrackPolicy => {
    return localPublishProfile.value === 'guest' ? guestTrackPolicy : hostTrackPolicy
  }

  // --- CONNECTION HANDLING ---

  const startConnectionAsHost = async (): Promise<void> => {
    localPublishProfile.value = 'host'
    hid.setLocalRole('host')
    webRtcService.cleanup()
    webRtcService.initialize(true)
    if (localStream.value)
      webRtcService.publishLocalStream(localStream.value, getCurrentTrackPolicy())

    rtcStatus.value = 'connecting'
    const offer = await webRtcService.createOffer()
    await getSocketStore().wsService.sendOffer({ sdp: JSON.stringify(offer) })
  }

  const handleOffer = async (data: WsWebRTCOffer): Promise<void> => {
    hid.setLocalRole('guest')
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

    webRtcService.publishLocalStream(stream, getCurrentTrackPolicy())
  }

  // --- LISTENERS ---

  webRtcService.onIceCandidateGenerated = async (candidate): Promise<void> => {
    await getSocketStore().wsService.sendIceCandidate({ candidate: JSON.stringify(candidate) })
  }

  webRtcService.onMessageReceived = (data: string, channelLabel: string): void => {
    try {
      const msg = JSON.parse(data)

      if (channelLabel === 'chat-channel' && msg.type === 'CHAT') {
        chat.handleIncomingMessage(msg.payload)
      }

      if (channelLabel === 'hid-control') {
        // FIX: Allow MOUSE_ACTION and KEYBOARD_EVENT to pass through to the HID Channel
        if (
          msg.type === 'HID_HANDSHAKE' ||
          msg.type === 'MOUSE_MOVE' ||
          msg.type === 'HID_PERMISSION_UPDATE' ||
          msg.type === 'MOUSE_ACTION' ||
          msg.type === 'KEYBOARD_EVENT'
        ) {
          hid.handleIncomingMessage(msg)
        }
      }

      if (channelLabel === 'system-events') {
        system.handleIncomingMessage(msg)
      }

      if (channelLabel === 'metrics' && msg.type === 'METRICS') {
        connectionMetrics.applyRemoteMetrics(msg.payload)
      }
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
    // Host po otwarciu kanału danych wysyła handshake z rozmiarem ekranu
    if (localPublishProfile.value === 'host') {
      hid.sendHandshake()
    }
  }

  // --- UTILS ---

  const forceDisconnect = (): void => {
    connectionMetrics.stop()
    rtcStatus.value = 'disconnected'
    webRtcService.cleanup()
    hid.resetState()
    remoteStream.value = null
    localPublishProfile.value = 'host'

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
    hid.setLocalRole(profile)
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

  const toggleTrackByHint = (
    kind: 'audio' | 'video',
    contentHint: string,
    isEnabled: boolean
  ): void => {
    if (!localStream.value) return
    const tracks =
      kind === 'audio' ? localStream.value.getAudioTracks() : localStream.value.getVideoTracks()
    const targetTrack = tracks.find((t) => t.contentHint === contentHint)

    if (!targetTrack && kind === 'audio') {
      if (contentHint === 'speech') {
        const track = tracks.find((t) => t.getSettings().channelCount === 1) || tracks[0]
        if (track) track.enabled = isEnabled
      } else if (contentHint === 'music') {
        const track = tracks.find((t) => t.getSettings().channelCount === 2) || tracks[1]
        if (track) track.enabled = isEnabled
      }
      return
    }

    if (targetTrack) targetTrack.enabled = isEnabled
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
    chatMessages: chat.chatMessages,
    remoteMouse: hid.remoteMouse,
    localMetrics: connectionMetrics.localMetrics,
    remoteMetrics: connectionMetrics.remoteMetrics,
    isGuestControlAllowed,
    sendChatMessage: chat.sendChatMessage,
    sendMousePosition: (x: number, y: number): void =>
      hid.sendMouseFromVideo(
        Math.min(Math.max(x, 0), 100) / 100,
        Math.min(Math.max(y, 0), 100) / 100
      ),
    sendMouseAction: (
      button: 'left' | 'right' | 'middle',
      action: 'click' | 'double',
      x: number,
      y: number
    ): void => {
      hid.sendMouseAction(button, action, x, y)
    },
    sendKeyboardEvent: hid.sendKeyboardEvent,
    sendVideoCommand: system.sendVideoCommand,
    toggleTrackByHint,
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
