import { defineStore, storeToRefs } from 'pinia'
import { computed, nextTick, ref, watch } from 'vue'

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
  const connectionStore = useConnectionStore()
  const socketStore = useSocketStore()
  const webRtcStore = useWebRtcStore()
  const signalingStore = useSignalingStore()
  const logStore = useLogStore()
  const hidChannel = useHidChannel()

  const deviceStore = useDeviceStore()
  const audioStore = useAudioSettingsStore()
  const captureStore = useCaptureStore()

  const isResponding = ref(false)
  let hostSessionBootstrap: Promise<void> | null = null

  const shouldSyncAudioTracks = (): boolean =>
    socketStore.isAcknowledged && captureStore.isCapturing

  const bootstrapHostSession = async (): Promise<void> => {
    if (!captureStore.isCapturing) {
      await captureStore.startHostCapture({ lite: true })
      if (!captureStore.isCapturing) {
        await captureStore.startHostCapture()
      }
    }

    if (webRtcStore.rtcStatus === 'disconnected' && webRtcStore.localStream) {
      await signalingStore.startConnectionAsHost()
    }

    if (captureStore.isCapturing) {
      captureStore.completeHostCaptureSetup()
    }
  }

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
    (ack): void => {
      if (!ack || !connectionStore.isHost) return
      logStore.addLog('WS_ACK_RECEIVED', 'Handshake zakończony!', 'socket')
      if (hostSessionBootstrap) return

      hostSessionBootstrap = (async () => {
        await nextTick()
        await bootstrapHostSession()
      })().finally(() => {
        hostSessionBootstrap = null
      })
    }
  )

  // Bez localStream w deps — unika pętli toggleTrack podczas budowy strumienia (regresja po cleanup).
  watch(
    () => audioStore.microphoneMuted,
    (): void => {
      if (!shouldSyncAudioTracks()) return
      webRtcStore.toggleTrackByHint('audio', 'speech', !audioStore.microphoneMuted)
    }
  )

  watch(
    () => audioStore.includeSystemAudio,
    (isEnabled): void => {
      if (!shouldSyncAudioTracks()) return
      webRtcStore.toggleTrackByHint('audio', 'music', isEnabled)
    }
  )

  const handleRespond = async (accept: boolean): Promise<void> => {
    if (isResponding.value) return
    isResponding.value = true
    try {
      logStore.addLog('WS_SENDING_RESPONSE', `Odpowiedź: ${accept}`, 'socket')
      await socketStore.respondToRequest(accept)
    } finally {
      isResponding.value = false
    }
  }

  void deviceStore.refreshMicrophones()

  return {
    ...storeToRefs(audioStore),
    ...storeToRefs(deviceStore),
    ...storeToRefs(captureStore),

    isResponding,

    toggleMicrophone: audioStore.toggleMicrophone,
    toggleSystemAudio: audioStore.toggleSystemAudio,
    toggleScreenVideo: captureStore.toggleScreenVideo,
    refreshMicrophones: deviceStore.refreshMicrophones,
    applySelectedMicrophone: captureStore.applySelectedMicrophone,

    startCapture: captureStore.startHostCapture,
    stopCapture: captureStore.stopCapture,
    handleRespond,

    activeVideoQuality: computed(() => captureStore.activeVideoQuality),
    applyQualityPreset: captureStore.applyQualityPreset,

    isRecording: computed(() => recordingService.isRecording),
    startRecording: () => recordingService.startRecording(webRtcStore.remoteStream),
    stopRecording: () => recordingService.stopRecording()
  }
})
