<script setup lang="ts">
import { computed } from 'vue'
import { microphoneService } from '@renderer/services/micService'
import InputThresholdL from './InputThresholdL.vue'
import MicrophoneEffectsS from '../simple/MicrophoneEffectsS.vue'

interface VoicePreset {
  id: string
  label: string
}

const props = defineProps<{
  micLimiterEnabled: boolean
  micBassBoostEnabled: boolean
  micStudioModeEnabled: boolean
  micMonitoringEnabled: boolean
  activeVoicePreset: string
  voicePresets: VoicePreset[]
  micInputThresholdDb: number
  limiterThresholdDb: number
}>()

const emit = defineEmits<{
  (e: 'update:mic-limiter-enabled', value: boolean): void
  (e: 'update:mic-bass-boost-enabled', value: boolean): void
  (e: 'update:mic-studio-mode-enabled', value: boolean): void
  (e: 'update:mic-monitoring-enabled', value: boolean): void
  (e: 'update:active-voice-preset', value: string): void
  (e: 'update:mic-input-threshold-db', value: number): void
}>()

const micLimiterEnabledModel = computed({
  get: () => props.micLimiterEnabled,
  set: (value: boolean) => emit('update:mic-limiter-enabled', value)
})

const micBassBoostEnabledModel = computed({
  get: () => props.micBassBoostEnabled,
  set: (value: boolean) => emit('update:mic-bass-boost-enabled', value)
})

const micStudioModeEnabledModel = computed({
  get: () => props.micStudioModeEnabled,
  set: (value: boolean) => emit('update:mic-studio-mode-enabled', value)
})

const micMonitoringEnabledModel = computed({
  get: () => props.micMonitoringEnabled,
  set: (value: boolean) => emit('update:mic-monitoring-enabled', value)
})

const activeVoicePresetModel = computed({
  get: () => props.activeVoicePreset,
  set: (value: string) => emit('update:active-voice-preset', value)
})

const micInputThresholdDbModel = computed({
  get: () => props.micInputThresholdDb,
  set: (value: number) => emit('update:mic-input-threshold-db', value)
})

const toggleLimiter = (): void => {
  micLimiterEnabledModel.value = !micLimiterEnabledModel.value
}

const toggleBassBoost = (): void => {
  micBassBoostEnabledModel.value = !micBassBoostEnabledModel.value
}

const toggleStudioMode = (): void => {
  micStudioModeEnabledModel.value = !micStudioModeEnabledModel.value
}

const toggleMonitoring = (): void => {
  micMonitoringEnabledModel.value = !micMonitoringEnabledModel.value
}

const selectVoicePreset = (presetId: string): void => {
  activeVoicePresetModel.value = presetId
  microphoneService.setVoicePreset(
    presetId as 'none' | 'studio' | 'high' | 'robot' | 'demon' | 'radio'
  )
}
</script>

<template>
  <MicrophoneEffectsS
    :mic-limiter-enabled="micLimiterEnabledModel"
    :mic-bass-boost-enabled="micBassBoostEnabledModel"
    :mic-studio-mode-enabled="micStudioModeEnabledModel"
    :mic-monitoring-enabled="micMonitoringEnabledModel"
    :voice-presets="voicePresets"
    :active-voice-preset="activeVoicePresetModel"
    @toggle-limiter="toggleLimiter"
    @toggle-bass-boost="toggleBassBoost"
    @toggle-studio-mode="toggleStudioMode"
    @toggle-monitoring="toggleMonitoring"
    @select-voice-preset="selectVoicePreset"
  >
    <template #input-threshold>
      <InputThresholdL
        v-model="micInputThresholdDbModel"
        :limiter-threshold-db="limiterThresholdDb"
      />
    </template>
  </MicrophoneEffectsS>
</template>
