import { defineStore } from 'pinia'
import { watch } from 'vue'
import { useStorage } from '@vueuse/core'
import { videoService } from '@renderer/services/video/videoService'
import { microphoneService } from '@renderer/services/audio/in/micService' // Upewnij się co do ścieżki!

export const useAudioSettingsStore = defineStore('audioSettings', () => {
  const includeSystemAudio = useStorage('buddy-audio-include-system', true)
  const includeMicrophone = useStorage('buddy-audio-include-microphone', true)
  const microphoneMuted = useStorage('buddy-audio-microphone-muted', false)

  const localSystemAudioVolume = useStorage<number>('buddy-audio-local-system-volume', 1)
  const localMicrophoneVolume = useStorage<number>('buddy-audio-local-microphone-volume', 1)

  const remoteMicVolume = useStorage<number>('buddy-audio-remote-mic-volume', 1)
  const remoteSystemVolume = useStorage<number>('buddy-audio-remote-system-volume', 1)
  const audioDuckingLevel = useStorage<number>('buddy-audio-ducking-level', 0.3)
  const audioSpeechThreshold = useStorage<number>('buddy-audio-speech-threshold', 0.02)
  const audioGainSmoothing = useStorage<number>('buddy-audio-gain-smoothing', 0.08)
  const audioHoldFrames = useStorage<number>('buddy-audio-hold-frames', 8)

  const toggleMicrophone = (isMuted: boolean): void => {
    microphoneMuted.value = isMuted
    includeMicrophone.value = !isMuted
  }

  const toggleSystemAudio = (isMuted: boolean): void => {
    includeSystemAudio.value = !isMuted
  }

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
