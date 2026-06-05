import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { videoService } from '@renderer/services/video/videoService'
import { microphoneService } from '@renderer/services/audio/in/micService' // Upewnij się co do ścieżki!

export const useAudioSettingsStore = defineStore('audioSettings', () => {
  const includeSystemAudio = ref(true)
  /** Czy w ogóle uruchamiamy tor mikrofonu w capture (graph + ścieżka); wyciszenie do peerów = `microphoneMuted`. */
  const includeMicrophone = ref(true)
  /** Domyślnie wyciszony po połączeniu; odsłuch lokalny (monitoring) działa niezależnie od tej flagi. */
  const microphoneMuted = ref(true)

  /**
   * Ostatni stan wyciszenia mikrofonu gościa (zgłoszony z okna gościa przez relay).
   * Używany tylko na hoście do STATE_UPDATE → panel gościa; nie mylić z `microphoneMuted` (mikrofon hosta).
   */
  const guestRelayMicrophoneMuted = ref(true)

  const setGuestRelayMicrophoneMuted = (muted: boolean): void => {
    guestRelayMicrophoneMuted.value = muted
  }

  const localSystemAudioVolume = ref<number>(1)
  const localMicrophoneVolume = ref<number>(1)

  const remoteMicVolume = ref<number>(1)
  const remoteSystemVolume = ref<number>(1)
  const audioDuckingLevel = ref<number>(0.3)
  const audioSpeechThreshold = ref<number>(0.02)
  const audioGainSmoothing = ref<number>(0.08)
  const audioHoldFrames = ref<number>(8)

  const toggleMicrophone = (isMuted: boolean): void => {
    microphoneMuted.value = isMuted
  }

  const toggleSystemAudio = (isMuted: boolean): void => {
    includeSystemAudio.value = !isMuted
  }

  watch(localSystemAudioVolume, (val): void => videoService.setSystemAudioVolume(val))
  watch(localMicrophoneVolume, (val): void => microphoneService.setVolume(val))

  return {
    includeSystemAudio,
    includeMicrophone,
    microphoneMuted,
    guestRelayMicrophoneMuted,
    setGuestRelayMicrophoneMuted,
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
