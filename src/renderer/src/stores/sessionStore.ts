import { defineStore } from 'pinia'
import { ref, computed, shallowRef, watch } from 'vue'
import { useConnectionStore } from './connectionStore'
import { useSocketStore } from './socketStore'
import { useWebRtcStore } from './webRtcStore'
import { useLogStore } from './devStores/logStore' // Upewnij się, że ta ścieżka jest poprawna
import { videoService } from '@renderer/services/videoService'
import { microphoneService } from '@renderer/services/micService'

// Zmieniono nazwę na useSessionStore (konwencja Vue)
export const SessionStore = defineStore('session', () => {
  const connectionStore = useConnectionStore()
  const socketStore = useSocketStore()
  const webRtcStore = useWebRtcStore()
  const logStore = useLogStore()

  const includeSystemAudio = ref(true)
  const includeMicrophone = ref(true)
  const availableMicrophones = ref<Array<{ deviceId: string; label: string }>>([])
  const selectedMicrophoneDeviceId = ref<string>('')
  const micLimiterEnabled = ref(true)
  const micBassBoostEnabled = ref(false)
  const micStudioModeEnabled = ref(false)
  const micMonitoringEnabled = ref(false)
  const micInputThresholdDb = ref(-60)
  const activeVoicePreset = ref<'none' | 'studio' | 'high' | 'robot' | 'demon' | 'radio'>('none')

  const sharedTextureStream = shallowRef<MediaStream | null>(null)
  const currentCaptureMode = ref<'host-shared' | 'host-native' | 'guest-mic' | null>(null)
  const isCapturing = computed((): boolean => currentCaptureMode.value !== null)
  const sharedTextureCaptureFps = 120

  let stopFrameSubscription: (() => void) | null = null
  let hiddenCanvas: HTMLCanvasElement | null = null

  // Dodano typ zwracany : boolean
  const hasLocalAudioTrack = (hint: 'speech' | 'music'): boolean => {
    return !!webRtcStore.localStream?.getAudioTracks().some((t) => t.contentHint === hint)
  }

  // FIX: Funkcja musi być async, aby obsłużyć re-negocjację WebRTC
  const assignLocalStream = async (stream: MediaStream): Promise<void> => {
    if (webRtcStore.rtcStatus === 'disconnected') {
      webRtcStore.localStream = stream
    } else {
      await webRtcStore.publishLocalStream(stream)
    }
  }

  const prepareExternalMicTrack = async (): Promise<MediaStreamTrack | null> => {
    if (!includeMicrophone.value) {
      microphoneService.stop()
      return null
    }

    return microphoneService.start(
      selectedMicrophoneDeviceId.value || undefined,
      webRtcStore.localMicrophoneVolume
    )
  }

  const startSharedTextureCapture = async (): Promise<void> => {
    try {
      window.screenCapture.registerReceiver()

      if (!hiddenCanvas) {
        hiddenCanvas = document.createElement('canvas')
        hiddenCanvas.width = 1920
        hiddenCanvas.height = 1080
      }

      const ctx = hiddenCanvas.getContext('2d', { alpha: false })
      if (!ctx) {
        logStore.addLog('ERROR', 'Brak kontekstu 2D dla wirtualnego canvasa.', 'api')
        return
      }

      ctx.fillStyle = 'black'
      ctx.fillRect(0, 0, hiddenCanvas.width, hiddenCanvas.height)

      stopFrameSubscription?.()
      stopFrameSubscription = window.screenCapture.onFrameReceived((frameData) => {
        try {
          if (hiddenCanvas) {
            ctx.drawImage(frameData, 0, 0, hiddenCanvas.width, hiddenCanvas.height)
          }
        } catch (e) {
          logStore.addLog('ERROR', `Błąd renderowania klatki: ${e}`, 'api')
        } finally {
          if (frameData && typeof frameData.close === 'function') frameData.close()
        }
      })

      const canvasStream = hiddenCanvas.captureStream(sharedTextureCaptureFps)
      const canvasVideoTrack = canvasStream.getVideoTracks()[0]

      if (!canvasVideoTrack) {
        logStore.addLog('ERROR', 'Brak video tracka z canvas captureStream.', 'api')
        return
      }

      const micTrack = await prepareExternalMicTrack()

      sharedTextureStream.value = await videoService.startWithExternalVideoTrack(canvasVideoTrack, {
        includeSystemAudio: includeSystemAudio.value,
        externalMicTrack: micTrack ?? undefined,
        systemAudioVolume: webRtcStore.localSystemAudioVolume
      })

      const videoTrack = sharedTextureStream.value.getVideoTracks()[0]
      if (videoTrack) videoTrack.enabled = true

      webRtcStore.setLocalPreviewFps(sharedTextureCaptureFps)
      webRtcStore.setLocalPreviewQuality('high')
      currentCaptureMode.value = 'host-shared'

      await assignLocalStream(sharedTextureStream.value)
      window.screenCapture.requestStream()
    } catch (e) {
      logStore.addLog('ERROR', `Błąd sharedTexture: ${e}`, 'api')
    }
  }

  const startCapture = async (): Promise<void> => {
    if (
      isCapturing.value &&
      (currentCaptureMode.value === 'host-shared' || currentCaptureMode.value === 'host-native')
    )
      return
    if (isCapturing.value) await stopCapture()

    webRtcStore.setLocalPublishProfile('host')
    logStore.addLog('NATIVE_CAPTURE', 'Rozpoczynanie przechwytywania (Host)...', 'api')

    if (window.screenCapture) {
      await startSharedTextureCapture()
      return
    }

    try {
      const micTrack = await prepareExternalMicTrack()
      const stream = await videoService.start({
        includeScreen: true,
        includeSystemAudio: includeSystemAudio.value,
        externalMicTrack: micTrack ?? undefined,
        systemAudioVolume: webRtcStore.localSystemAudioVolume
      })
      currentCaptureMode.value = 'host-native'
      await assignLocalStream(stream)
    } catch (err) {
      logStore.addLog('ERROR', `Błąd przechwytywania: ${err}`, 'api')
    }
  }

  const startMicrophoneCaptureForGuest = async (): Promise<void> => {
    if (
      isCapturing.value &&
      currentCaptureMode.value === 'guest-mic' &&
      hasLocalAudioTrack('speech')
    )
      return
    if (isCapturing.value) await stopCapture()

    webRtcStore.setLocalPublishProfile('guest')
    logStore.addLog('MIC_CAPTURE', 'Uruchamianie mikrofonu (Gość)...', 'api')

    try {
      const micTrack = await prepareExternalMicTrack()
      const stream = await videoService.start({
        includeScreen: false,
        includeSystemAudio: false,
        externalMicTrack: micTrack ?? undefined
      })
      currentCaptureMode.value = 'guest-mic'
      await assignLocalStream(stream)
    } catch (err) {
      logStore.addLog('ERROR', `Błąd mikrofonu: ${err}`, 'api')
    }
  }

  const stopCapture = async (): Promise<void> => {
    if (!isCapturing.value) return
    logStore.addLog('NATIVE_CAPTURE', 'Zatrzymano wideo/audio.', 'api')

    stopFrameSubscription?.()
    stopFrameSubscription = null

    if (window.screenCapture) window.screenCapture.stopStream()

    if (sharedTextureStream.value) {
      sharedTextureStream.value.getTracks().forEach((t) => t.stop())
      sharedTextureStream.value = null
    }

    currentCaptureMode.value = null
    microphoneService.stop()
    await videoService.stop()
    webRtcStore.localStream = null
    webRtcStore.setLocalPreviewFps(null)
    webRtcStore.setLocalPreviewQuality(null)

    if (hiddenCanvas) {
      hiddenCanvas.width = 0
      hiddenCanvas.height = 0
      hiddenCanvas = null
    }
  }

  const handleRespond = async (accept: boolean): Promise<void> => {
    logStore.addLog('WS_SENDING_RESPONSE', `Odpowiedź: ${accept}`, 'socket')
    if (accept) await startCapture()
    await socketStore.respondToRequest(accept)
  }

  const refreshMicrophones = async (): Promise<void> => {
    try {
      const microphones = await microphoneService.getAvailableMicrophones()
      availableMicrophones.value = microphones

      const hasSelected = microphones.some(
        (device) => device.deviceId === selectedMicrophoneDeviceId.value
      )
      if (!hasSelected) {
        selectedMicrophoneDeviceId.value = microphones[0]?.deviceId ?? ''
      }
    } catch (err) {
      logStore.addLog('ERROR', `Błąd odczytu mikrofonów: ${err}`, 'api')
      availableMicrophones.value = []
      selectedMicrophoneDeviceId.value = ''
    }
  }

  const applySelectedMicrophone = async (): Promise<void> => {
    if (!includeMicrophone.value) {
      return
    }

    if (!isCapturing.value) {
      return
    }

    const nextMicTrack = await microphoneService.start(
      selectedMicrophoneDeviceId.value || undefined,
      webRtcStore.localMicrophoneVolume
    )

    if (!nextMicTrack) {
      webRtcStore.toggleMicrophone(true)
      logStore.addLog(
        'ERROR',
        `Nie udało się przełączyć mikrofonu na: ${selectedMicrophoneDeviceId.value || 'domyślny systemowy'}. Mikrofon został wyciszony.`,
        'api'
      )
      return
    }

    const currentStream = webRtcStore.localStream
    if (!currentStream) return

    const audioTracks = currentStream.getAudioTracks()
    const speechTracks = audioTracks.filter((track) => track.contentHint === 'speech')
    const tracksToRemove =
      speechTracks.length > 0 ? speechTracks : audioTracks.length === 1 ? [audioTracks[0]] : []

    tracksToRemove.forEach((track) => {
      currentStream.removeTrack(track)
      track.stop()
    })

    if (tracksToRemove.length === 0 && audioTracks.length > 0) {
      logStore.addLog(
        'WARN',
        'Nie znaleziono jednoznacznej ścieżki mikrofonowej do podmiany. Dodano nowy track mikrofonu obok istniejących audio.',
        'api'
      )
    }

    currentStream.addTrack(nextMicTrack)
    await assignLocalStream(currentStream)
    logStore.addLog(
      'MIC_CAPTURE',
      `Przełączono mikrofon na: ${selectedMicrophoneDeviceId.value || 'domyślny systemowy'}`,
      'api'
    )
  }

  // ==========================================
  // ORKIESTRACJA (Reakcje na stan systemu)
  // ==========================================

  watch(
    () => connectionStore.isHost,
    (isHost): void => {
      webRtcStore.setLocalPublishProfile(isHost ? 'host' : 'guest')
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

      if (!connected && isCapturing.value) {
        await stopCapture()
      }
    }
  )

  watch(
    () => socketStore.isAcknowledged,
    async (ack): Promise<void> => {
      if (!ack) return
      logStore.addLog('WS_ACK_RECEIVED', 'Handshake zakończony!', 'socket')

      if (!isCapturing.value) {
        connectionStore.isHost ? await startCapture() : await startMicrophoneCaptureForGuest()
      }

      if (
        connectionStore.isHost &&
        webRtcStore.rtcStatus === 'disconnected' &&
        webRtcStore.localStream
      ) {
        await webRtcStore.startConnectionAsHost()
      }
    }
  )

  watch(includeMicrophone, (isEnabled): void => {
    webRtcStore.toggleMicrophone(!isEnabled)
    if (!isEnabled || connectionStore.isHost || !socketStore.isAcknowledged) return
    if (!hasLocalAudioTrack('speech')) void startMicrophoneCaptureForGuest()
  })

  watch(includeSystemAudio, (isMuted): void => {
    webRtcStore.toggleSystemAudio(!isMuted)
  })

  void refreshMicrophones()

  return {
    includeSystemAudio,
    includeMicrophone,
    availableMicrophones,
    selectedMicrophoneDeviceId,
    micLimiterEnabled,
    micBassBoostEnabled,
    micStudioModeEnabled,
    micMonitoringEnabled,
    micInputThresholdDb,
    activeVoicePreset,
    isCapturing,
    startCapture,
    stopCapture,
    handleRespond,
    refreshMicrophones,
    applySelectedMicrophone
  }
})
