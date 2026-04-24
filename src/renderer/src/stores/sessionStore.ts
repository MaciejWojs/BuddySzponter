import { defineStore, storeToRefs } from 'pinia'
import { computed, watch } from 'vue'

import { useConnectionStore } from './connectionStore'
import { useSocketStore } from './socketStore'
import { useWebRtcStore } from './webRtcStore'
import { useSignalingStore } from './signalingStore'
import { useLogStore } from './devStores/logStore'

import { useDeviceStore } from './deviceStore'
import { useAudioSettingsStore } from './audioSettingsStore'
import { useCaptureStore } from './captureStore'

import { useHidChannel } from '@renderer/composables/channels/HidChannel'
import { recordingService } from '@renderer/services/video/RecordingService'

export const useSessionStore = defineStore('session', () => {
  // Podstawowe story
  const connectionStore = useConnectionStore()
  const socketStore = useSocketStore()
  const webRtcStore = useWebRtcStore()
  const signalingStore = useSignalingStore()
  const logStore = useLogStore()
  const hidChannel = useHidChannel()

  const deviceStore = useDeviceStore()
  const audioStore = useAudioSettingsStore()
  const captureStore = useCaptureStore()

  // ==========================================
  // ORCHESTRATION
  // ==========================================

  watch(
    () => connectionStore.isHost,
    (isHost): void => {
      const role = isHost ? 'host' : 'guest'
      webRtcStore.setLocalPublishProfile(role)
      hidChannel.setLocalRole(role)
    },
    { immediate: true }
  )

  watch(
    () => socketStore.isConnected,
    async (connected): Promise<void> => {
      logStore.addLog(
        connected ? 'WS_CONNECTED' : 'WS_DISCONNECTED',
        connected ? 'Połączono' : 'Rozłączono',
        'socket'
      )
      if (!connected && captureStore.isCapturing) {
        await captureStore.stopCapture()
      }
    }
  )

  watch(
    () => socketStore.isAcknowledged,
    async (ack): Promise<void> => {
      if (!ack) return
      logStore.addLog('WS_ACK_RECEIVED', 'Handshake zakończony!', 'socket')

      if (!captureStore.isCapturing) {
        connectionStore.isHost
          ? await captureStore.startHostCapture()
          : await captureStore.startGuestCapture()
      }

      if (
        connectionStore.isHost &&
        webRtcStore.rtcStatus === 'disconnected' &&
        webRtcStore.localStream
      ) {
        await signalingStore.startConnectionAsHost()
      }
    }
  )

  const hasLocalAudioTrack = (hint: 'speech' | 'music'): boolean => {
    return !!webRtcStore.localStream?.getAudioTracks().some((t) => t.contentHint === hint)
  }

  watch(
    () => audioStore.includeMicrophone,
    (isEnabled): void => {
      webRtcStore.toggleTrackByHint('audio', 'speech', isEnabled)
      if (!isEnabled || connectionStore.isHost || !socketStore.isAcknowledged) return
      if (!hasLocalAudioTrack('speech')) void captureStore.startGuestCapture()
    }
  )

  watch(
    () => audioStore.includeSystemAudio,
    (isEnabled): void => {
      webRtcStore.toggleTrackByHint('audio', 'music', isEnabled)
    }
  )

  const handleRespond = async (accept: boolean): Promise<void> => {
    logStore.addLog('WS_SENDING_RESPONSE', `Odpowiedź: ${accept}`, 'socket')
    if (accept) await captureStore.startHostCapture()
    await socketStore.respondToRequest(accept)
  }

  void deviceStore.refreshMicrophones()

  return {
    ...storeToRefs(audioStore),
    ...storeToRefs(deviceStore),
    ...storeToRefs(captureStore),

    toggleMicrophone: audioStore.toggleMicrophone,
    toggleSystemAudio: audioStore.toggleSystemAudio,
    toggleScreenVideo: captureStore.toggleScreenVideo,
    refreshMicrophones: deviceStore.refreshMicrophones,
    applySelectedMicrophone: captureStore.applySelectedMicrophone,

    startCapture: captureStore.startHostCapture,
    stopCapture: captureStore.stopCapture,
    handleRespond,

    isRecording: computed(() => recordingService.isRecording),
    startRecording: () => recordingService.startRecording(webRtcStore.remoteStream),
    stopRecording: () => recordingService.stopRecording()
  }
})
