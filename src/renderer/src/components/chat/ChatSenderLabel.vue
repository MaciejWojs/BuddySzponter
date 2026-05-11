<template>
  <span class="px-1 text-xs text-white/85">
    {{ text }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  text: string
}>()
</script>
