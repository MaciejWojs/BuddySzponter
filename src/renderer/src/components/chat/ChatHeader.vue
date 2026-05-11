<template>
  <header class="flex items-center justify-between gap-3 px-1 py-1">
    <h3 class="m-0 text-base font-semibold text-white">Czat</h3>

    <button
      type="button"
      class="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15"
      @click="$emit('close')"
    >
      <span class="text-2xl leading-none">&times;</span>
    </button>
  </header>
</template>

<script setup lang="ts">
defineEmits<{
  close: []
}>()
</script>
