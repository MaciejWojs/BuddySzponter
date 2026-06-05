<template>
  <label class="flex items-center gap-2 text-xs text-white/85">
    <span class="whitespace-nowrap">{{ label }}</span>
    <input
      :value="modelValue"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      class="h-1.5 w-24 cursor-pointer appearance-none rounded bg-white/20 accent-white"
      @input="onInput"
    />
  </label>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    modelValue: number
    min?: number
    max?: number
    step?: number
  }>(),
  {
    min: 0,
    max: 2,
    step: 0.1
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const onInput = (event: Event): void => {
  const value = parseFloat((event.target as HTMLInputElement).value)
  emit('update:modelValue', value)
}
</script>
