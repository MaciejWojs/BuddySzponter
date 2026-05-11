<template>
  <header class="flex items-center gap-2 px-1 py-1">
    <h3 class="m-0 min-w-0 flex-1 text-base font-semibold text-white">Czat</h3>

    <button
      v-if="showDownloadFolder"
      type="button"
      class="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-white/90 transition hover:bg-white/15"
      title="Folder zapisu plików z czatu"
      @click="$emit('setDownloadFolder')"
    >
      Folder
    </button>

    <button
      type="button"
      class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15"
      @click="$emit('close')"
    >
      <span class="text-2xl leading-none">&times;</span>
    </button>
  </header>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    showDownloadFolder?: boolean
  }>(),
  { showDownloadFolder: true }
)

defineEmits<{
  close: []
  setDownloadFolder: []
}>()
</script>
