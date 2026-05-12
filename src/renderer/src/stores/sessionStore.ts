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
        if (connectionStore.isHost) {
          await captureStore.startHostCapture()
        }
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

  watch(
    () => [audioStore.microphoneMuted, webRtcStore.localStream] as const,
    (): void => {
      webRtcStore.toggleTrackByHint('audio', 'speech', !audioStore.microphoneMuted)
    },
    { immediate: true, deep: true }
  )

  watch(
    () => [audioStore.includeSystemAudio, webRtcStore.localStream] as const,
    (): void => {
      webRtcStore.toggleTrackByHint('audio', 'music', audioStore.includeSystemAudio)
    },
    { immediate: true, deep: true }
  )

  const CAPTURE_START_TIMEOUT_MS = 8000

  const startHostCaptureWithTimeout = async (): Promise<void> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const timeoutPromise = new Promise<void>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`startHostCapture timeout (${CAPTURE_START_TIMEOUT_MS}ms)`))
      }, CAPTURE_START_TIMEOUT_MS)
    })

    try {
      await Promise.race([captureStore.startHostCapture(), timeoutPromise])
    } catch (e) {
      console.error('[SessionStore] Capture nie wystartowało:', e)
      logStore.addLog('CAPTURE_TIMEOUT', `Capture nie wystartowało: ${String(e)}`, 'api')
    } finally {
      if (timeoutId !== null) clearTimeout(timeoutId)
    }
  }

  const handleRespond = async (accept: boolean): Promise<void> => {
    logStore.addLog('WS_SENDING_RESPONSE', `Odpowiedź: ${accept}`, 'socket')
    if (accept) await startHostCaptureWithTimeout()
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

    activeVideoQuality: computed(() => captureStore.activeVideoQuality),
    applyQualityPreset: captureStore.applyQualityPreset,

    isRecording: computed(() => recordingService.isRecording),
    startRecording: () => recordingService.startRecording(webRtcStore.remoteStream),
    stopRecording: () => recordingService.stopRecording()
  }
})
