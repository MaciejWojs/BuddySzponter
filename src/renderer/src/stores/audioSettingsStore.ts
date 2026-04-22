import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { videoService } from '@renderer/services/video/videoService'
import { microphoneService } from '@renderer/services/audio/in/micService' // Upewnij się co do ścieżki!

export const useAudioSettingsStore = defineStore('audioSettings', () => {
  // Stan Lokalny
  const includeSystemAudio = ref(true)
  const includeMicrophone = ref(true)
  const microphoneMuted = ref(false)

  const localSystemAudioVolume = ref<number>(1)
  const localMicrophoneVolume = ref<number>(1)

  // Stan Zdalny & Ducking
  const remoteMicVolume = ref<number>(1)
  const remoteSystemVolume = ref<number>(1)
  const audioDuckingLevel = ref<number>(0.3)
  const audioSpeechThreshold = ref<number>(0.02)
  const audioGainSmoothing = ref<number>(0.08)
  const audioHoldFrames = ref<number>(8)

  // Akcje
  const toggleMicrophone = (isMuted: boolean): void => {
    microphoneMuted.value = isMuted
    includeMicrophone.value = !isMuted
  }

  const toggleSystemAudio = (isMuted: boolean): void => {
    includeSystemAudio.value = !isMuted
  }

  // Automatyczna synchronizacja ze sprzętem (Mięśnie)
  watch(localSystemAudioVolume, (val): void => videoService.setSystemAudioVolume(val))
  watch(localMicrophoneVolume, (val): void => microphoneService.setVolume(val))

  watch(microphoneMuted, (muted) => {
    if (muted) includeMicrophone.value = false
  })

  return {
    includeSystemAudio,
    includeMicrophone,
    microphoneMuted,
    localSystemAudioVolume,
    localMicrophoneVolume,
    remoteMicVolume,
    remoteSystemVolume,
    audioDuckingLevel,
    audioSpeechThreshold,
    audioGainSmoothing,
    audioHoldFrames,
    toggleMicrophone,
    toggleSystemAudio
  }
})
