import { defineStore } from 'pinia'
import { ref, computed, shallowRef, watch } from 'vue'
import { useConnectionStore } from './connectionStore'
import { useSocketStore } from './socketStore'
import { useWebRtcStore } from './webRtcStore'
import { useLogStore } from './devStores/logStore' // Upewnij się, że ta ścieżka jest poprawna
import { videoService } from '@renderer/composables/video/videoService'

// Zmieniono nazwę na useSessionStore (konwencja Vue)
export const SessionStore = defineStore('session', () => {
  const connectionStore = useConnectionStore()
  const socketStore = useSocketStore()
  const webRtcStore = useWebRtcStore()
  const logStore = useLogStore()

  const includeSystemAudio = ref(true)
  const includeMicrophone = ref(true)
  const microphoneDeviceId = ref<string | undefined>(undefined)
  const availableMicrophoneDevices = ref<Array<{ deviceId: string; label: string }>>([])

  const sharedTextureStream = shallowRef<MediaStream | null>(null)
  const currentCaptureMode = ref<'host-shared' | 'host-native' | 'guest-mic' | null>(null)
  const isCapturing = computed((): boolean => videoService.isRunning || !!sharedTextureStream.value)
  const sharedTextureCaptureFps = 120

  let stopFrameSubscription: (() => void) | null = null
  let hiddenCanvas: HTMLCanvasElement | null = null
  let sharedTextureGeneratorWriter: WritableStreamDefaultWriter<VideoFrame> | null = null
  let sharedTextureGeneratorTrack: MediaStreamTrack | null = null

  // Dodano typ zwracany : boolean
  const hasLocalAudioTrack = (hint: 'speech' | 'music'): boolean => {
    return !!webRtcStore.localStream?.getAudioTracks().some((t) => t.contentHint === hint)
  }

  const refreshMicrophoneDevices = async (): Promise<void> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const microphones = devices.filter((device) => device.kind === 'audioinput')

      availableMicrophoneDevices.value = microphones.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Mikrofon ${index + 1}`
      }))

      if (!microphoneDeviceId.value && availableMicrophoneDevices.value.length > 0) {
        microphoneDeviceId.value = availableMicrophoneDevices.value[0].deviceId
      }

      if (
        microphoneDeviceId.value &&
        !availableMicrophoneDevices.value.some(
          (device) => device.deviceId === microphoneDeviceId.value
        )
      ) {
        microphoneDeviceId.value = availableMicrophoneDevices.value[0]?.deviceId
      }
    } catch (e) {
      logStore.addLog('ERROR', `Błąd pobierania urządzeń audio: ${e}`, 'api')
    }
  }

  // FIX: Funkcja musi być async, aby obsłużyć re-negocjację WebRTC
  const assignLocalStream = async (stream: MediaStream): Promise<void> => {
    if (webRtcStore.rtcStatus === 'disconnected') {
      webRtcStore.localStream = stream
    } else {
      await webRtcStore.publishLocalStream(stream)
    }
  }

  const startSharedTextureCapture = async (): Promise<void> => {
    try {
      const useCpuCapture =
        typeof window.screenCapture.shouldUseCpu === 'function'
          ? await window.screenCapture.shouldUseCpu()
          : false

      if (!useCpuCapture && typeof window.screenCapture.registerReceiver === 'function') {
        window.screenCapture.registerReceiver()
      }

      const win = window as unknown as {
        MediaStreamTrackGenerator?: new (init: { kind: 'video' }) => MediaStreamTrack & {
          writable: WritableStream<VideoFrame>
          contentHint: string
        }
      }

      if (!win.MediaStreamTrackGenerator) {
        logStore.addLog('ERROR', 'Brak MediaStreamTrackGenerator w bieżącym środowisku.', 'api')
        return
      }

      const generator = new win.MediaStreamTrackGenerator({ kind: 'video' })
      generator.contentHint = 'detail'
      sharedTextureGeneratorWriter = generator.writable.getWriter()

      stopFrameSubscription?.()
      stopFrameSubscription = window.screenCapture.onFrameReceived((frameData) => {
        try {
          sharedTextureGeneratorWriter?.write(frameData.clone()).catch((writeError) => {
            console.error('[SessionStore] Błąd zapisu klatki do generatora:', writeError)
          })
        } catch (e) {
          logStore.addLog('ERROR', `Błąd zapisu klatki do generatora: ${e}`, 'api')
        } finally {
          if (frameData && typeof frameData.close === 'function') frameData.close()
        }
      })

      if (!availableMicrophoneDevices.value.length) {
        await refreshMicrophoneDevices()
      }

      sharedTextureGeneratorTrack = generator
      sharedTextureStream.value = await videoService.startWithExternalVideoTrack(generator, {
        includeSystemAudio: includeSystemAudio.value,
        includeMicrophone: includeMicrophone.value,
        microphoneDeviceId: microphoneDeviceId.value,
        systemAudioVolume: webRtcStore.localSystemAudioVolume,
        microphoneVolume: webRtcStore.localMicrophoneVolume
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
      if (!availableMicrophoneDevices.value.length) {
        await refreshMicrophoneDevices()
      }

      const stream = await videoService.start({
        includeScreen: true,
        includeSystemAudio: includeSystemAudio.value,
        includeMicrophone: includeMicrophone.value,
        microphoneDeviceId: microphoneDeviceId.value,
        systemAudioVolume: webRtcStore.localSystemAudioVolume,
        microphoneVolume: webRtcStore.localMicrophoneVolume
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
      if (!availableMicrophoneDevices.value.length) {
        await refreshMicrophoneDevices()
      }

      const stream = await videoService.start({
        includeScreen: false,
        includeSystemAudio: false,
        includeMicrophone: includeMicrophone.value,
        microphoneDeviceId: microphoneDeviceId.value,
        microphoneVolume: webRtcStore.localMicrophoneVolume
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

    if (sharedTextureGeneratorWriter) {
      sharedTextureGeneratorWriter.close().catch(() => {})
      sharedTextureGeneratorWriter = null
    }

    if (sharedTextureGeneratorTrack) {
      sharedTextureGeneratorTrack.stop()
      sharedTextureGeneratorTrack = null
    }

    currentCaptureMode.value = null
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
    (connected): void => {
      logStore.addLog(
        connected ? 'WS_CONNECTED' : 'WS_DISCONNECTED',
        connected ? 'Połączono' : 'Rozłączono',
        'socket'
      )
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

  watch(microphoneDeviceId, async (deviceId, previousDeviceId): Promise<void> => {
    if (!deviceId || deviceId === previousDeviceId || !includeMicrophone.value) return
    if (!isCapturing.value) return

    if (currentCaptureMode.value === 'guest-mic') {
      await stopCapture()
      await startMicrophoneCaptureForGuest()
      return
    }

    if (currentCaptureMode.value === 'host-native' || currentCaptureMode.value === 'host-shared') {
      await stopCapture()
      await startCapture()
    }
  })

  watch(includeSystemAudio, (isMuted): void => {
    webRtcStore.toggleSystemAudio(!isMuted)
  })

  return {
    includeSystemAudio,
    includeMicrophone,
    microphoneDeviceId,
    availableMicrophoneDevices,
    refreshMicrophoneDevices,
    isCapturing,
    startCapture,
    stopCapture,
    handleRespond
  }
})
