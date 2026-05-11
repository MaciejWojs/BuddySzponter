<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import AdvancedDuckingS from '../simple/AdvancedDuckingS.vue'

interface DuckingPreset {
  id: 'balanced' | 'voice-focus' | 'aggressive' | 'stream'
  label: string
  hint: string
  values: {
    level: number
    threshold: number
    smoothing: number
    holdFrames: number
  }
}

const props = withDefaults(
  defineProps<{
    compact?: boolean
  }>(),
  {
    compact: false
  }
)

const webRtcStore = useWebRtcStore()

const isAdvancedOpen = ref(false)

const duckingPresets: DuckingPreset[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    hint: 'Uniwersalny profil do codziennej rozmowy.',
    values: { level: 0.3, threshold: 0.02, smoothing: 0.08, holdFrames: 8 }
  },
  {
    id: 'voice-focus',
    label: 'Voice Focus',
    hint: 'Szybciej reaguje na mowę gościa.',
    values: { level: 0.42, threshold: 0.016, smoothing: 0.05, holdFrames: 10 }
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    hint: 'Mocne tłumienie tła przy aktywnej mowie.',
    values: { level: 0.62, threshold: 0.012, smoothing: 0.04, holdFrames: 14 }
  },
  {
    id: 'stream',
    label: 'Stream',
    hint: 'Płynniejsze przejścia i dłuższe podtrzymanie.',
    values: { level: 0.38, threshold: 0.018, smoothing: 0.12, holdFrames: 18 }
  }
]

const isNear = (a: number, b: number, epsilon = 0.0005): boolean => Math.abs(a - b) <= epsilon

const isPresetActive = (preset: DuckingPreset): boolean => {
  return (
    isNear(webRtcStore.audioDuckingLevel, preset.values.level) &&
    isNear(webRtcStore.audioSpeechThreshold, preset.values.threshold) &&
    isNear(webRtcStore.audioGainSmoothing, preset.values.smoothing) &&
    webRtcStore.audioHoldFrames === preset.values.holdFrames
  )
}

const activeDuckingPreset = computed<DuckingPreset | null>(() => {
  return duckingPresets.find((preset) => isPresetActive(preset)) ?? null
})

const activePresetId = computed<DuckingPreset['id'] | null>(
  () => activeDuckingPreset.value?.id ?? null
)
const activePresetLabel = computed<string | null>(() => activeDuckingPreset.value?.label ?? null)

const applyDuckingPreset = (preset: DuckingPreset): void => {
  webRtcStore.audioDuckingLevel = preset.values.level
  webRtcStore.audioSpeechThreshold = preset.values.threshold
  webRtcStore.audioGainSmoothing = preset.values.smoothing
  webRtcStore.audioHoldFrames = preset.values.holdFrames
}

const resetDuckingToDefault = (): void => {
  const defaultPreset = duckingPresets[0]
  applyDuckingPreset(defaultPreset)
}

const applyDuckingPresetById = (presetId: DuckingPreset['id']): void => {
  const preset = duckingPresets.find((item) => item.id === presetId)
  if (!preset) return
  applyDuckingPreset(preset)
}

const toggleAdvanced = (): void => {
  isAdvancedOpen.value = !isAdvancedOpen.value
}

const updateAudioDuckingLevel = (value: number): void => {
  webRtcStore.audioDuckingLevel = value
}

const updateAudioSpeechThreshold = (value: number): void => {
  webRtcStore.audioSpeechThreshold = value
}

const updateAudioGainSmoothing = (value: number): void => {
  webRtcStore.audioGainSmoothing = value
}

const updateAudioHoldFrames = (value: number): void => {
  webRtcStore.audioHoldFrames = value
}
</script>

<template>
  <AdvancedDuckingS
    :compact="props.compact"
    :is-advanced-open="isAdvancedOpen"
    :ducking-presets="duckingPresets"
    :active-preset-id="activePresetId"
    :active-preset-label="activePresetLabel"
    :audio-ducking-level="webRtcStore.audioDuckingLevel"
    :audio-speech-threshold="webRtcStore.audioSpeechThreshold"
    :audio-gain-smoothing="webRtcStore.audioGainSmoothing"
    :audio-hold-frames="webRtcStore.audioHoldFrames"
    @toggle-advanced="toggleAdvanced"
    @reset-default="resetDuckingToDefault"
    @apply-preset="applyDuckingPresetById"
    @update:audio-ducking-level="updateAudioDuckingLevel"
    @update:audio-speech-threshold="updateAudioSpeechThreshold"
    @update:audio-gain-smoothing="updateAudioGainSmoothing"
    @update:audio-hold-frames="updateAudioHoldFrames"
  />
</template>
