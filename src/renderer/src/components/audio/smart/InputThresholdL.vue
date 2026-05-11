<script setup lang="ts">
import { computed } from 'vue'
import InputThresholdS from '../simple/InputThresholdS.vue'

const props = defineProps<{
  modelValue: number
  limiterThresholdDb: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const clampUnit = (value: number): number => Math.max(0, Math.min(1, value))

const easeInOutSine = (value: number): number => {
  return 0.5 - Math.cos(Math.PI * clampUnit(value)) / 2
}

const inverseEaseInOutSine = (value: number): number => {
  return Math.acos(1 - 2 * clampUnit(value)) / Math.PI
}

const mapValueToSinePercent = (value: number, min: number, max: number): number => {
  if (max <= min) return 0
  const normalized = clampUnit((value - min) / (max - min))
  return inverseEaseInOutSine(normalized) * 100
}

const mapSinePercentToValue = (percent: number, min: number, max: number): number => {
  if (max <= min) return min
  return min + easeInOutSine(percent / 100) * (max - min)
}

const isAutoGate = computed(() => props.modelValue <= -60)

const sliderPercent = computed<number>({
  get: () => mapValueToSinePercent(props.modelValue, -60, props.limiterThresholdDb),
  set: (value) => {
    emit('update:modelValue', mapSinePercentToValue(value, -60, props.limiterThresholdDb))
  }
})

const handleSliderPercentChange = (value: number): void => {
  sliderPercent.value = value
}
</script>

<template>
  <InputThresholdS
    :slider-percent="sliderPercent"
    :is-auto-gate="isAutoGate"
    :threshold-db="modelValue"
    @update:slider-percent="handleSliderPercentChange"
  />
</template>
