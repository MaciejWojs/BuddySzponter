// renderer/src/stores/sessionStore.ts
import { defineStore } from 'pinia'
import { ref, computed, shallowRef, watch } from 'vue'
import { useConnectionStore } from './connectionStore'
import { useSocketStore } from './socketStore'
import { useWebRtcStore } from './webRtcStore'
import { useLogStore } from './devStores/logStore'
import { videoService } from '@renderer/services/videoService'
import { microphoneService } from '@renderer/services/micService'

export const useSessionStore = defineStore('session', () => {
  const connectionStore = useConnectionStore()
  const socketStore = useSocketStore()
  const webRtcStore = useWebRtcStore()
  const logStore = useLogStore()
  const includeScreenVideo = ref(true)

  // Local Capture State
  const includeSystemAudio = ref(true)
  const includeMicrophone = ref(true)

  const microphoneMuted = ref(false)

  // Local Volume State (Moved from WebRTC store as it relates to local device capture)
  const localSystemAudioVolume = ref<number>(1)
  const localMicrophoneVolume = ref<number>(1)

  // Device Management
  const availableMicrophones = ref<Array<{ deviceId: string; label: string }>>([])
  const selectedMicrophoneDeviceId = ref<string>('')

  // Capture Orchestration
  const sharedTextureStream = shallowRef<MediaStream | null>(null)
  const currentCaptureMode = ref<'host-shared' | 'host-native' | 'guest-mic' | null>(null)
  const isCapturing = computed((): boolean => currentCaptureMode.value !== null)
  const sharedTextureCaptureFps = 60

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
    // Dla wideo wywołujemy uniwersalną funkcję z WebRtcStore (nie ma contentHint, więc dajemy puste '')
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
          if (!sharedTextureGeneratorWriter) {
            return
          }

          const shouldDropFrame =
            sharedTextureGeneratorWriter.desiredSize !== null &&
            sharedTextureGeneratorWriter.desiredSize <= 0

          if (shouldDropFrame) {
            return
          }

          const clonedFrame = frameData.clone()
          sharedTextureGeneratorWriter.write(clonedFrame).catch((writeError) => {
            console.error('[SessionStore] Błąd zapisu klatki do generatora:', writeError)
            if (clonedFrame && typeof clonedFrame.close === 'function') {
              clonedFrame.close()
            }
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

    // IMPORTANT: Clear the stream in WebRtcStore when capture stops
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
        await webRtcStore.startConnectionAsHost()
      }
    }
  )

  // Synchronizuj mute mikrofonu z UI
  watch(microphoneMuted, (muted) => {
    if (muted) {
      includeMicrophone.value = false
    }
    // Jeśli odmutowany, nie wymuszaj włączenia mikrofonu, pozwól UI sterować
  })

  // Syncing UI toggles to track enabled states
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
    includeScreenVideo, // (opcjonalnie)

    microphoneMuted,

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
