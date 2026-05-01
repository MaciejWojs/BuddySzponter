// renderer/src/stores/captureStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useWebRtcStore } from './webRtcStore'
import { useDeviceStore } from './deviceStore'
import { useAudioSettingsStore } from './audioSettingsStore'
import { useLogStore } from './devStores/logStore'

import { videoService } from '@renderer/services/video/videoService'
import { microphoneService } from '@renderer/services/audio/in/micService'
import { screenCaptureService } from '@renderer/services/video/ScreenCaptureService'
import { recordingService } from '@renderer/services/video/RecordingService'
import { webRtcService } from '@renderer/composables/connection/webRTCService'

export type VideoQualityPreset = 'low' | 'medium' | 'high' | 'ultra'

export const useCaptureStore = defineStore('capture', () => {
  const webRtcStore = useWebRtcStore()
  const deviceStore = useDeviceStore()
  const audioStore = useAudioSettingsStore()
  const logStore = useLogStore()

  const includeScreenVideo = ref(true)
  const currentCaptureMode = ref<'host-shared' | 'host-native' | 'guest-mic' | null>(null)
  const isCapturing = computed((): boolean => currentCaptureMode.value !== null)

  const sharedTextureCaptureFps = 60

  const activeVideoQuality = ref<VideoQualityPreset>('high')

  const applyQualityPreset = async (preset: VideoQualityPreset): Promise<void> => {
    activeVideoQuality.value = preset
    switch (preset) {
      case 'low':
        await webRtcService.setVideoQualityLimits(2000, 30)
        break
      case 'medium':
        await webRtcService.setVideoQualityLimits(5000, 60)
        break
      case 'high':
        await webRtcService.setVideoQualityLimits(8000, 60)
        break
      case 'ultra':
        await webRtcService.setVideoQualityLimits(15000, 120)
        break
    }
  }

  const toggleScreenVideo = (isHidden: boolean): void => {
    includeScreenVideo.value = !isHidden
    webRtcStore.toggleTrackByHint('video', '', !isHidden)
  }

  const assignLocalStream = async (stream: MediaStream): Promise<void> => {
    await webRtcStore.publishLocalStream(stream)
    if (webRtcStore.rtcStatus !== 'disconnected') {
      void applyQualityPreset(activeVideoQuality.value)
    }
  }

  const prepareExternalMicTrack = async (): Promise<MediaStreamTrack | null> => {
    if (!audioStore.includeMicrophone) {
      microphoneService.stop()
      return null
    }
    return microphoneService.start(
      deviceStore.selectedMicrophoneDeviceId || undefined,
      audioStore.localMicrophoneVolume
    )
  }

  const startHostCapture = async (): Promise<void> => {
    if (
      isCapturing.value &&
      (currentCaptureMode.value === 'host-shared' || currentCaptureMode.value === 'host-native')
    )
      return
    if (isCapturing.value) await stopCapture()

    webRtcStore.setLocalPublishProfile('host')
    logStore.addLog('NATIVE_CAPTURE', 'Rozpoczynanie przechwytywania (Host)...', 'api')

    if (window.screenCapture) {
      try {
        const micTrack = await prepareExternalMicTrack()
        const stream = await screenCaptureService.startSharedTextureCapture(
          sharedTextureCaptureFps,
          audioStore.includeSystemAudio,
          audioStore.localSystemAudioVolume,
          micTrack
        )

        if (stream) {
          currentCaptureMode.value = 'host-shared'
          await assignLocalStream(stream)
          return
        } else {
          console.warn(
            '[CaptureStore] Shared Texture Capture zwróciło null, przechodzenie do fallbacku.'
          )
        }
      } catch (e) {
        console.log('error w Shared Texture Capture:', e)
      }
    }

    try {
      console.warn(
        '[CaptureStore] Shared Texture Capture niedostępne, przechodzenie do fallbacku (getDisplayMedia + VideoService)'
      )
      const micTrack = await prepareExternalMicTrack()

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      })
      const videoTrack = displayStream.getVideoTracks()[0]
      videoTrack.contentHint = 'detail'

      const stream = await videoService.startWithExternalVideoTrack(videoTrack, {
        includeSystemAudio: audioStore.includeSystemAudio,
        externalMicTrack: micTrack ?? undefined,
        systemAudioVolume: audioStore.localSystemAudioVolume
      })

      currentCaptureMode.value = 'host-native'
      await assignLocalStream(stream)

      videoTrack.onended = () => stopCapture()
    } catch (err) {
      logStore.addLog('ERROR', `Błąd przechwytywania natywnego: ${err}`, 'api')
    }
  }

  const startGuestCapture = async (): Promise<void> => {
    if (isCapturing.value && currentCaptureMode.value === 'guest-mic') return
    if (isCapturing.value) await stopCapture()

    webRtcStore.setLocalPublishProfile('guest')
    logStore.addLog('MIC_CAPTURE', 'Uruchamianie mikrofonu (Gość)...', 'api')

    try {
      const micTrack = await prepareExternalMicTrack()

      // Gość nie potrzebuje Miksera (videoService) ani wideo. Po prostu tworzymy strumień z mikrofonem.
      const stream = new MediaStream()
      if (micTrack) {
        stream.addTrack(micTrack)
      }

      currentCaptureMode.value = 'guest-mic'
      await assignLocalStream(stream)
    } catch (err) {
      logStore.addLog('ERROR', `Błąd mikrofonu: ${err}`, 'api')
    }
  }

  const stopCapture = async (): Promise<void> => {
    if (!isCapturing.value) return
    logStore.addLog('NATIVE_CAPTURE', 'Zatrzymano wideo/audio.', 'api')

    if (recordingService.isRecording) recordingService.stopRecording()

    // Zatrzymujemy wszystkie serwisy
    screenCaptureService.stop()
    microphoneService.stop()
    await videoService.stop()

    currentCaptureMode.value = null

    if (webRtcStore.localStream) {
      webRtcStore.localStream.getTracks().forEach((t) => t.stop())
      webRtcStore.localStream = null
    }
  }

  const applySelectedMicrophone = async (): Promise<void> => {
    if (!audioStore.includeMicrophone || !isCapturing.value) return

    const nextMicTrack = await microphoneService.start(
      deviceStore.selectedMicrophoneDeviceId || undefined,
      audioStore.localMicrophoneVolume
    )

    if (!nextMicTrack) {
      audioStore.includeMicrophone = false
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
  }

  return {
    includeScreenVideo,
    isCapturing,
    activeVideoQuality,
    toggleScreenVideo,
    startHostCapture,
    startGuestCapture,
    stopCapture,
    applySelectedMicrophone,
    applyQualityPreset
  }
})
