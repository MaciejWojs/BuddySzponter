<template>
  <button
    type="button"
    :title="title"
    class="rounded-md border px-3 py-2 text-xs font-semibold text-white transition"
    :class="buttonClass"
    :disabled="!controlGranted"
    @click="$emit('toggle')"
  >
    Schowek: {{ enabled ? 'ON' : 'OFF' }}
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  enabled: boolean
  controlGranted: boolean
}>()

defineEmits<{
  toggle: []
}>()

const buttonClass = computed(() => {
  if (!props.controlGranted) return 'border-white/10 bg-black/40 text-white/40 cursor-not-allowed'
  if (props.enabled) return 'border-sky-400/60 bg-sky-500/20 hover:bg-sky-500/30'
  return 'border-white/15 bg-black/55 hover:bg-black/70'
})

const title = computed(() => {
  if (!props.controlGranted) return 'Synchronizacja schowka wymaga oddanej kontroli'
  return props.enabled ? 'Wyłącz synchronizację schowka' : 'Włącz synchronizację schowka'
})
</script>
