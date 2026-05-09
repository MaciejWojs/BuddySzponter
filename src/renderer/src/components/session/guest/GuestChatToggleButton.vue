<template>
  <button
    type="button"
    :title="active ? 'Schowaj czat' : 'Pokaż czat'"
    class="relative rounded-md border px-3 py-2 text-xs font-semibold text-white transition"
    :class="buttonClass"
    @click="$emit('toggle')"
  >
    Czat
    <span
      v-if="hasUnread"
      class="absolute -right-1 -top-1 inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-black/60"
    />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  active: boolean
  hasUnread: boolean
}>()

defineEmits<{
  toggle: []
}>()

const buttonClass = computed(() => {
  if (props.hasUnread) return 'border-amber-400/70 bg-amber-500/20 hover:bg-amber-500/30'
  if (props.active) return 'border-emerald-400/60 bg-emerald-500/20 hover:bg-emerald-500/30'
  return 'border-white/15 bg-black/55 hover:bg-black/70'
})
</script>
