<template>
  <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-4">
    <h3 class="text-sm font-semibold text-[#e0e0e0] mb-4">{{ title }}</h3>

    <div class="space-y-3">
      <slot></slot>
    </div>

    <div class="border-t border-[#333] mt-4 pt-4">
      <button
        type="button"
        class="w-full px-4 py-2 bg-blue-600 text-white rounded-md font-medium text-sm hover:bg-blue-700 transition-colors"
        @click="applyChanges"
      >
        Apply Changes
      </button>
    </div>

    <div v-if="statusMessage" :class="['text-xs p-2 rounded mt-2', statusClass]">
      {{ statusMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  title: string
}

defineProps<Props>()

interface Emits {
  (e: 'apply'): void
}

const emit = defineEmits<Emits>()

const statusMessage = ref<string>('')
const statusType = ref<'success' | 'error' | null>(null)

const statusClass = computed(() => {
  if (statusType.value === 'success') return 'bg-green-900 text-green-200'
  if (statusType.value === 'error') return 'bg-red-900 text-red-200'
  return 'bg-gray-900 text-gray-200'
})

const applyChanges = (): void => {
  emit('apply')
  showStatus('Changes applied!', 'success')
}

const showStatus = (message: string, type: 'success' | 'error'): void => {
  statusMessage.value = message
  statusType.value = type
  setTimeout(() => {
    statusMessage.value = ''
    statusType.value = null
  }, 2500)
}

defineExpose({
  showStatus
})
</script>
