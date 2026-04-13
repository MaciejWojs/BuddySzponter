<template>
  <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-4">
    <div class="flex items-center justify-between mb-2">
      <label class="text-sm font-semibold text-[#e0e0e0]">{{ label }}</label>
      <span
        :class="[
          'text-xs font-mono px-2 py-1 rounded',
          isActive ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
        ]"
      >
        {{ isActive ? 'ON' : 'OFF' }}
      </span>
    </div>
    <div class="flex gap-2">
      <button
        class="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors font-medium"
        @click="emit('update:modelValue', true)"
      >
        Enable
      </button>
      <button
        class="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors font-medium"
        @click="emit('update:modelValue', false)"
      >
        Disable
      </button>
    </div>
    <div v-if="description" class="text-xs text-[#888] mt-3 italic">{{ description }}</div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string
  modelValue: boolean
  description?: string
}

const props = defineProps<Props>()

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const emit = defineEmits<Emits>()

const isActive = props.modelValue
</script>
