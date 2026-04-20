import { watch } from 'vue'
import type { AppAudioSettings } from '@shared/schemas/ipc'
import { SessionStore } from '@renderer/stores/sessionStore'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'

export function useAudioSettingsPersistence(): void {
  const sessionStore = SessionStore()
  const webRtcStore = useWebRtcStore()

  let hydrated = false

  const hydrateAudioSettings = async (): Promise<void> => {
    try {
      const saved = await window.api.settings.getAudioSettings()

      sessionStore.includeSystemAudio = saved.includeSystemAudio
      sessionStore.includeMicrophone = saved.includeMicrophone

      webRtcStore.localMicrophoneVolume = saved.localMicrophoneVolume
      webRtcStore.localSystemAudioVolume = saved.localSystemAudioVolume
      webRtcStore.remoteMicVolume = saved.remoteMicVolume
      webRtcStore.remoteSystemVolume = saved.remoteSystemVolume

      sessionStore.micLimiterEnabled = saved.micLimiterEnabled
      sessionStore.micBassBoostEnabled = saved.micBassBoostEnabled
      sessionStore.micStudioModeEnabled = saved.micStudioModeEnabled
      sessionStore.micMonitoringEnabled = saved.micMonitoringEnabled
      sessionStore.micInputThresholdDb = saved.micInputThresholdDb
      sessionStore.activeVoicePreset = saved.activeVoicePreset

      webRtcStore.audioDuckingLevel = saved.audioDuckingLevel
      webRtcStore.audioSpeechThreshold = saved.audioSpeechThreshold
      webRtcStore.audioGainSmoothing = saved.audioGainSmoothing
      webRtcStore.audioHoldFrames = saved.audioHoldFrames
    } catch (error) {
      console.warn('[AudioSettingsPersistence] Failed to hydrate audio settings:', error)
    } finally {
      hydrated = true
    }
  }

  watch(
    () =>
      ({
        includeSystemAudio: sessionStore.includeSystemAudio,
        includeMicrophone: sessionStore.includeMicrophone,
        localMicrophoneVolume: webRtcStore.localMicrophoneVolume,
        localSystemAudioVolume: webRtcStore.localSystemAudioVolume,
        remoteMicVolume: webRtcStore.remoteMicVolume,
        remoteSystemVolume: webRtcStore.remoteSystemVolume,
        micLimiterEnabled: sessionStore.micLimiterEnabled,
        micBassBoostEnabled: sessionStore.micBassBoostEnabled,
        micStudioModeEnabled: sessionStore.micStudioModeEnabled,
        micMonitoringEnabled: sessionStore.micMonitoringEnabled,
        micInputThresholdDb: sessionStore.micInputThresholdDb,
        activeVoicePreset: sessionStore.activeVoicePreset,
        audioDuckingLevel: webRtcStore.audioDuckingLevel,
        audioSpeechThreshold: webRtcStore.audioSpeechThreshold,
        audioGainSmoothing: webRtcStore.audioGainSmoothing,
        audioHoldFrames: webRtcStore.audioHoldFrames
      }) satisfies Partial<AppAudioSettings>,
    (settings) => {
      if (!hydrated) return
      void window.api.settings.setAudioSettings(settings)
    }
  )

  void hydrateAudioSettings()
}
