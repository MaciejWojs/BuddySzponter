<template>
  <button
    type="button"
    :title="muted ? 'Włącz mikrofon' : 'Wycisz mikrofon'"
    class="rounded-md border border-white/15 bg-black/55 px-3 py-2 text-xs font-semibold text-white transition hover:bg-black/70"
    :class="muted ? 'border-rose-500/60 text-rose-300' : ''"
    @click="$emit('toggle')"
  >
    {{ muted ? 'Mikro: OFF' : 'Mikro: ON' }}
  </button>
</template>

<script setup lang="ts">
defineProps<{
  muted: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>
