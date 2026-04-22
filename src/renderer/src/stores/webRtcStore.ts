// renderer/src/stores/webRtcStore.ts
import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import {
  guestTrackPolicy,
  hostTrackPolicy,
  webRtcService
} from '@renderer/composables/connection/webRTCService'
import { useConnectionMetrics } from '@renderer/composables/connection/useConnectionMetrics'
import { messageRouter } from '@renderer/composables/webrtc/MessageRouter'

export const useWebRtcStore = defineStore('webrtc', () => {
  // --- STAN POŁĄCZENIA ---
  const rtcStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const localStream = shallowRef<MediaStream | null>(null)
  const remoteStream = shallowRef<MediaStream | null>(null)
  const localPublishProfile = ref<'host' | 'guest'>('host')

  const connectionMetrics = useConnectionMetrics(rtcStatus)

  const getCurrentTrackPolicy = (): typeof guestTrackPolicy | typeof hostTrackPolicy => {
    return localPublishProfile.value === 'guest' ? guestTrackPolicy : hostTrackPolicy
  }

  webRtcService.onMessageReceived = (data: string, channelLabel: string): void => {
    messageRouter.route(channelLabel, data)
  }

  webRtcService.onRemoteStreamReceived = (stream): void => {
    remoteStream.value = stream
  }

  webRtcService.onDataChannelOpened = (): void => {
    rtcStatus.value = 'connected'
    connectionMetrics.start()
  }

  // --- ACTIONS ---

  const publishLocalStream = async (stream: MediaStream): Promise<void> => {
    localStream.value = stream
    if (rtcStatus.value === 'disconnected') return
    webRtcService.publishLocalStream(stream, getCurrentTrackPolicy())
  }

  const setLocalPublishProfile = (profile: 'host' | 'guest'): void => {
    localPublishProfile.value = profile
    if (rtcStatus.value !== 'disconnected' && localStream.value) {
      webRtcService.publishLocalStream(localStream.value, getCurrentTrackPolicy())
    }
  }

  const forceDisconnect = (): void => {
    connectionMetrics.stop()
    rtcStatus.value = 'disconnected'
    webRtcService.cleanup()
    remoteStream.value = null
    localPublishProfile.value = 'host'
  }

  const disconnect = async (): Promise<void> => {
    if (rtcStatus.value === 'disconnected') return

    webRtcService.sendData('system-events', JSON.stringify({ type: 'DISCONNECT', payload: {} }))

    forceDisconnect()
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

    if (targetTrack) {
      targetTrack.enabled = isEnabled
    } else if (kind === 'audio') {
      if (contentHint === 'speech') {
        const t = tracks.find((t) => t.getSettings().channelCount === 1) || tracks[0]
        if (t) t.enabled = isEnabled
      } else if (contentHint === 'music') {
        const t = tracks.find((t) => t.getSettings().channelCount === 2) || tracks[1]
        if (t) t.enabled = isEnabled
      }
    }
  }

  return {
    rtcStatus,
    localStream,
    remoteStream,
    localPublishProfile,
    localMetrics: connectionMetrics.localMetrics,
    remoteMetrics: connectionMetrics.remoteMetrics,

    // Eksport metod
    getCurrentTrackPolicy,
    publishLocalStream,
    setLocalPublishProfile,
    forceDisconnect,
    disconnect,
    toggleTrackByHint,

    setLocalPreviewFps: connectionMetrics.setLocalPreviewFps,
    setLocalPreviewQuality: connectionMetrics.setLocalPreviewQuality,
    getRemoteTrackRole: (id: string) => webRtcService.getRemoteTrackRole(id)
  }
})
