<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { SessionStore } from '@renderer/stores/sessionStore'
import { microphoneService } from '@renderer/services/micService'
import SelectMicrophoneL from './smart/SelectMicrophoneL.vue'
import MicrophoneVolumeL from './smart/MicrophoneVolumeL.vue'
import VUMeterL from './smart/VUMeterL.vue'
import MicrophoneEffectsL from './smart/MicrophoneEffectsL.vue'
import MySystemAudioL from './smart/MySystemAudioL.vue'
import AdvancedDuckingL from './smart/AdvancedDuckingL.vue'

interface VoicePresetOption {
  id: 'none' | 'studio' | 'high' | 'robot' | 'demon' | 'radio'
  label: string
}

const webRtcStore = useWebRtcStore()
const sessionStore = SessionStore()
const { selectedMicrophoneDeviceId } = storeToRefs(sessionStore)

const isMyMicMuted = ref(false)
const micLimiterEnabled = ref(true)
const micBassBoostEnabled = ref(false)
const micStudioModeEnabled = ref(false)
const micMonitoringEnabled = ref(false)
const micInputThresholdDb = ref(-60)
const isAutoGate = computed(() => micInputThresholdDb.value <= -60)
const activeVoicePreset = ref<VoicePresetOption['id']>('none')

const voicePresets: VoicePresetOption[] = [
  { id: 'none', label: 'Czysty' },
  { id: 'studio', label: 'Studyjny' },
  { id: 'high', label: 'Wysoki' },
  { id: 'robot', label: 'Robot' },
  { id: 'demon', label: 'Demon' },
  { id: 'radio', label: 'Radio' }
]

const limiterThresholdDb = computed<number>(() => (micLimiterEnabled.value ? -10 : 0))

const clampDb = (value: number, min = -60, max = 0): number => {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

const linearToDb = (linear: number): number => {
  return clampDb(20 * Math.log10(Math.max(1e-8, linear)))
}

const dbToLinear = (db: number): number => {
  return Math.max(0, Math.min(1, Math.pow(10, clampDb(db) / 20)))
}

const clampMicThresholdToContext = (): void => {
  micInputThresholdDb.value = clampDb(micInputThresholdDb.value, -60, limiterThresholdDb.value)
}

const syncGateThresholdToService = (): void => {
  const threshold = isAutoGate.value ? 0 : dbToLinear(micInputThresholdDb.value)
  microphoneService.setInputThreshold(threshold)
}

const handleDeviceChange = (): void => {
  void sessionStore.refreshMicrophones()
}

const handleMicMuteStateChange = (isMuted: boolean): void => {
  isMyMicMuted.value = isMuted
}

onMounted(() => {
  micMonitoringEnabled.value = microphoneService.getLocalMonitoringEnabled()
  micInputThresholdDb.value = clampDb(linearToDb(microphoneService.getInputThreshold()), -60, 0)
  clampMicThresholdToContext()

  microphoneService.setLimiter(micLimiterEnabled.value)
  syncGateThresholdToService()
  microphoneService.setStudioModeEnabled(micStudioModeEnabled.value)
  microphoneService.setBassBoost(micBassBoostEnabled.value ? 3 : 0)
  microphoneService.setVoicePreset(activeVoicePreset.value)

  void sessionStore.refreshMicrophones()
  navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange)
})

onUnmounted(() => {
  navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange)
})

watch(micLimiterEnabled, (enabled) => {
  microphoneService.setLimiter(enabled)
  clampMicThresholdToContext()
  syncGateThresholdToService()
})

watch(micMonitoringEnabled, (enabled) => {
  microphoneService.setLocalMonitoringEnabled(enabled)
})

watch(limiterThresholdDb, () => {
  clampMicThresholdToContext()
})

watch(micInputThresholdDb, (thresholdDb) => {
  const nextThreshold = isAutoGate.value ? 0 : dbToLinear(thresholdDb)
  microphoneService.setInputThreshold(nextThreshold)
})

watch(micBassBoostEnabled, (enabled) => {
  microphoneService.setBassBoost(enabled ? 3 : 0)
})

watch(micStudioModeEnabled, (enabled) => {
  microphoneService.setStudioModeEnabled(enabled)
  if (sessionStore.isCapturing) {
    void sessionStore.applySelectedMicrophone()
  }
})
</script>

<template>
  <div class="audio-settings-card">
    <SelectMicrophoneL />

    <MicrophoneVolumeL @mute-state-change="handleMicMuteStateChange" />

    <VUMeterL
      class="w-full"
      context-mode="auto-mic"
      :enabled="sessionStore.includeMicrophone && !isMyMicMuted"
      :is-capturing="sessionStore.isCapturing"
      :device-id="selectedMicrophoneDeviceId || undefined"
      :volume="webRtcStore.localMicrophoneVolume"
      :input-threshold-linear="dbToLinear(micInputThresholdDb)"
      :limiter-threshold-db="limiterThresholdDb"
    />

    <MicrophoneEffectsL
      v-model:mic-limiter-enabled="micLimiterEnabled"
      v-model:mic-bass-boost-enabled="micBassBoostEnabled"
      v-model:mic-studio-mode-enabled="micStudioModeEnabled"
      v-model:mic-monitoring-enabled="micMonitoringEnabled"
      v-model:active-voice-preset="activeVoicePreset"
      v-model:mic-input-threshold-db="micInputThresholdDb"
      :voice-presets="voicePresets"
      :limiter-threshold-db="limiterThresholdDb"
    />

    <MySystemAudioL />

    <AdvancedDuckingL compact />
  </div>
</template>

<style scoped>
.audio-settings-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.audio-settings-card :deep(.mb-4) {
  margin-bottom: 0;
}

.audio-settings-card :deep(.text-xs) {
  font-size: 11px;
}

.audio-settings-card :deep(.h-9.w-9) {
  height: 34px;
  width: 34px;
}

.audio-settings-card :deep(article.mt-4) {
  margin-top: 0;
}
</style>
