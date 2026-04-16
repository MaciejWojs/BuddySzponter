<!-- eslint-disable prettier/prettier -->
<!-- eslint-disable prettier/prettier -->
<script setup lang="ts">
import { computed } from 'vue'

interface Microphone {
  deviceId: string
  label: string
}

const props = defineProps<{
  modelValue: string
  microphones: Microphone[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>

<template>
  <div class="mb-4">
    <label class="text-xs text-gray-400 block mb-1.5 px-1">Mikrofon</label>
    <select
      v-model="selected"
      class="w-full px-3 py-2 rounded-md bg-zinc-800/60 border border-zinc-700/60 text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option value="">Domyslny mikrofon</option>
      <option v-for="mic in microphones" :key="mic.deviceId" :value="mic.deviceId">
        {{ mic.label }}
      </option>
    </select>
  </div>
</template>
