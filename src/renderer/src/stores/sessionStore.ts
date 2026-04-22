// renderer/src/stores/sessionStore.ts
import { defineStore } from 'pinia'
import { ref, computed, shallowRef, watch } from 'vue'
import { useConnectionStore } from './connectionStore'
import { useSocketStore } from './socketStore'
import { useWebRtcStore } from './webRtcStore'
import { useSignalingStore } from './signalingStore' // <-- DODANE
import { useLogStore } from './devStores/logStore'

import { videoService } from '@renderer/services/videoService'
import { microphoneService } from '@renderer/services/audio/out/micService'
import { deviceService } from '@renderer/services/hardware/DeviceService'
import { webRtcService } from '@renderer/composables/connection/webRTCService' // <-- DO NAGRYWANIA

export const useSessionStore = defineStore('session', () => {
  const connectionStore = useConnectionStore()
  const socketStore = useSocketStore()
  const webRtcStore = useWebRtcStore()
  const signalingStore = useSignalingStore()
  const logStore = useLogStore()

  const includeScreenVideo = ref(true)

  // ==========================================
  // STAN LOKALNY (AV)
  // ==========================================
  const includeSystemAudio = ref(true)
  const includeMicrophone = ref(true)
  const microphoneMuted = ref(false)

  const localSystemAudioVolume = ref<number>(1)
  const localMicrophoneVolume = ref<number>(1)

  // ==========================================
  // STAN ZDALNY & AUDIO MIXER (Przeniesione z webRtcStore)
  // ==========================================
  const remoteMicVolume = ref<number>(1)
  const remoteSystemVolume = ref<number>(1)

  const audioDuckingLevel = ref<number>(0.3)
  const audioSpeechThreshold = ref<number>(0.02)
  const audioGainSmoothing = ref<number>(0.08)
  const audioHoldFrames = ref<number>(8)

  // ==========================================
  // URZĄDZENIA
  // ==========================================
  const availableMicrophones = ref<Array<{ deviceId: string; label: string }>>([])
  const selectedMicrophoneDeviceId = ref<string>('')

  // ==========================================
  // NAGRYWANIE (Przeniesione z webRtcStore)
  // ==========================================
  const isRecording = ref<boolean>(false)

  const startRecording = (): void => {
    if (!webRtcStore.remoteStream) {
      logStore.addLog('WARN', 'Brak strumienia zdalnego do nagrywania', 'api')
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
    try {
      const buffer = await blob.arrayBuffer()
      await window.recorder.saveFile(buffer)
      logStore.addLog('INFO', 'Nagranie zapisane pomyślnie.', 'api')
    } catch {
      logStore.addLog('ERROR', 'Błąd zapisu nagrania.', 'api')
    }
  }

  // ==========================================
  // CAPTURE ORCHESTRATION
  // ==========================================
  const sharedTextureStream = shallowRef<MediaStream | null>(null)
  const currentCaptureMode = ref<'host-shared' | 'host-native' | 'guest-mic' | null>(null)
  const isCapturing = computed((): boolean => currentCaptureMode.value !== null)
  const sharedTextureCaptureFps = 120

  let stopFrameSubscription: (() => void) | null = null
  let hiddenCanvas: HTMLCanvasElement | null = null
  let sharedTextureGeneratorWriter: WritableStreamDefaultWriter<VideoFrame> | null = null
  let sharedTextureGeneratorTrack: MediaStreamTrack | null = null

  // --- FUNKCJE TOGGLE DLA UI ---
  const toggleMicrophone = (isMuted: boolean): void => {
    microphoneMuted.value = isMuted
    includeMicrophone.value = !isMuted
  }

  const toggleSystemAudio = (isMuted: boolean): void => {
    includeSystemAudio.value = !isMuted
  }

  const toggleScreenVideo = (isHidden: boolean): void => {
    includeScreenVideo.value = !isHidden
    webRtcStore.toggleTrackByHint('video', '', !isHidden)
  }

  // --- DEVICE VOLUME BINDINGS ---
  watch(localSystemAudioVolume, (val): void => videoService.setSystemAudioVolume(val))
  watch(localMicrophoneVolume, (val): void => microphoneService.setVolume(val))

  const hasLocalAudioTrack = (hint: 'speech' | 'music'): boolean => {
    return !!webRtcStore.localStream?.getAudioTracks().some((t) => t.contentHint === hint)
  }

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
      localMicrophoneVolume.value
    )
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

      sharedTextureGeneratorTrack = generator

      const micTrack = await prepareExternalMicTrack()

      sharedTextureStream.value = await videoService.startWithExternalVideoTrack(generator, {
        includeSystemAudio: includeSystemAudio.value,
        externalMicTrack: micTrack ?? undefined,
        systemAudioVolume: localSystemAudioVolume.value
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
        systemAudioVolume: localSystemAudioVolume.value
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

    if (isRecording.value) stopRecording() // Zabezpieczenie przed wiszącym nagrywaniem

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
    microphoneService.stop()
    await videoService.stop()

    if (webRtcStore.localStream) {
      webRtcStore.localStream.getTracks().forEach((t) => t.stop())
      webRtcStore.localStream = null
    }

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
      // Pobieramy z nowego, dedykowanego serwisu sprzętowego!
      const microphones = await deviceService.getAvailableMicrophones()
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
    if (!includeMicrophone.value) return
    if (!isCapturing.value) return

    const nextMicTrack = await microphoneService.start(
      selectedMicrophoneDeviceId.value || undefined,
      localMicrophoneVolume.value
    )

    if (!nextMicTrack) {
      includeMicrophone.value = false // Sync state
      logStore.addLog(
        'ERROR',
        `Nie udało się przełączyć mikrofonu na: ${selectedMicrophoneDeviceId.value || 'domyślny systemowy'}.`,
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

    currentStream.addTrack(nextMicTrack)
    await assignLocalStream(currentStream)
    logStore.addLog(
      'MIC_CAPTURE',
      `Przełączono mikrofon na: ${selectedMicrophoneDeviceId.value || 'domyślny systemowy'}`,
      'api'
    )
  }

  // ==========================================
  // ORCHESTRATION (Reacting to system state)
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
        // Wywołanie z NOWEGO signaling store!
        await signalingStore.startConnectionAsHost()
      }
    }
  )

  watch(microphoneMuted, (muted) => {
    if (muted) {
      includeMicrophone.value = false
    }
  })

  watch(includeMicrophone, (isEnabled): void => {
    if (!isEnabled) microphoneMuted.value = true
    webRtcStore.toggleTrackByHint('audio', 'speech', isEnabled)
    if (!isEnabled || connectionStore.isHost || !socketStore.isAcknowledged) return
    if (!hasLocalAudioTrack('speech')) void startMicrophoneCaptureForGuest()
  })

  watch(includeSystemAudio, (isEnabled): void => {
    webRtcStore.toggleTrackByHint('audio', 'music', isEnabled)
  })

  void refreshMicrophones()

  return {
    includeSystemAudio,
    includeMicrophone,
    localSystemAudioVolume,
    localMicrophoneVolume,
    includeScreenVideo,
    microphoneMuted,

    // AV State
    remoteMicVolume,
    remoteSystemVolume,
    audioDuckingLevel,
    audioSpeechThreshold,
    audioGainSmoothing,
    audioHoldFrames,

    // Recording
    isRecording,
    startRecording,
    stopRecording,

    toggleMicrophone,
    toggleSystemAudio,
    toggleScreenVideo,

    availableMicrophones,
    selectedMicrophoneDeviceId,
    isCapturing,
    startCapture,
    stopCapture,
    handleRespond,
    refreshMicrophones,
    applySelectedMicrophone
  }
})
