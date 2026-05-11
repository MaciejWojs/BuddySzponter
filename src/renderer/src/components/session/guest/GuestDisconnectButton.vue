<template>
  <button
    type="button"
    title="Rozłącz sesję"
    class="rounded-md border border-rose-500/60 bg-rose-600/80 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
    @click="$emit('disconnect')"
  >
    Rozłącz
  </button>
</template>

<script setup lang="ts">
defineEmits<{
  disconnect: []
}>()
</script>
