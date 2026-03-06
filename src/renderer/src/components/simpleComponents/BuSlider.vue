<template>
  <USlider
    :model-value="props.modelValue"
    :min="props.min"
    :max="props.max"
    :step="props.step"
    :disabled="props.disabled"
  />
</template>

<script setup lang="ts">
const props = defineProps({
  modelValue: {
    type: Number,
    default: 0
  },
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    default: 100
  },
  step: {
    type: Number,
    default: 1
  },
  disabled: {
    type: Boolean,
    default: false
  }
})
</script>
