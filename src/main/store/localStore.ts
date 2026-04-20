import Store from 'electron-store'
import { AppLanguage, Translation } from '../../shared/schemas/langSchemas'
import type { UserResponseSchema } from '../../shared/schemas/user'
import type { AppAudioSettings } from '../../shared/schemas/ipc'

type StoreModule = { default: typeof Store }

const StoreClass = (
  typeof Store === 'function' ? Store : (Store as unknown as StoreModule).default
) as typeof Store

interface LocalStoreSchema {
  language: AppLanguage
  availableLanguages: AppLanguage[]
  hardwareId: string | null
  microphoneDeviceId: string
  speakerDeviceId: string
  audioSettings: AppAudioSettings
}

export const localStore = new StoreClass<LocalStoreSchema>({
  name: 'app-settings',
  defaults: {
    language: 'en',
    availableLanguages: [],
    hardwareId: null,
    microphoneDeviceId: '',
    speakerDeviceId: '',
    audioSettings: {
      includeSystemAudio: true,
      includeMicrophone: true,
      localMicrophoneVolume: 1,
      localSystemAudioVolume: 1,
      remoteMicVolume: 1,
      remoteSystemVolume: 1,
      micLimiterEnabled: true,
      micBassBoostEnabled: false,
      micStudioModeEnabled: false,
      micMonitoringEnabled: false,
      micInputThresholdDb: -60,
      activeVoicePreset: 'none',
      audioDuckingLevel: 0.3,
      audioSpeechThreshold: 0.02,
      audioGainSmoothing: 0.08,
      audioHoldFrames: 8
    }
  }
})

export const authStore = new StoreClass<{
  accessToken: string | null
  user: UserResponseSchema | null
}>({
  name: 'auth',
  defaults: {
    accessToken: null,
    user: null
  }
})

export const translationStore = new StoreClass<Record<string, Translation>>({
  name: 'translations-cache'
})

export function clearLocalStore(): void {
  localStore.clear()
  authStore.clear()
  translationStore.clear()
}
