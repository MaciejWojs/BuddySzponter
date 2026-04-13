<template>
  <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-4">
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label class="text-sm font-semibold text-[#e0e0e0]">{{ label }}</label>
        <span class="text-xs text-[#a6e22e] font-mono">{{ formatValue(modelValue) }}</span>
      </div>
      <input
        :value="modelValue"
        type="range"
        :min="min"
        :max="max"
        :step="step"
        class="w-full accent-blue-500 cursor-pointer h-2"
        @input="emit('update:modelValue', parseFloat(($event.target as HTMLInputElement).value))"
      />
      <div class="flex justify-between text-xs text-[#666]">
        <span>{{ min }}</span>
        <span>{{ max }}</span>
      </div>
    </div>
    <div v-if="description" class="text-xs text-[#888] mt-3 italic">{{ description }}</div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string
  modelValue: number
  min?: number
  max?: number
  step?: number
  description?: string
}

defineProps<Props>()

interface Emits {
  (e: 'update:modelValue', value: number): void
}

const emit = defineEmits<Emits>()

const formatValue = (value: number): string => {
  if (value < 0.01) return '0.000'
  return value.toFixed(3)
}
</script>
