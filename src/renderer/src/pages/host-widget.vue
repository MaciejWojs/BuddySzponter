<script setup lang="ts">
import HostWidget from '@renderer/components/tray/HostWidget.vue'
</script>

<template>
  <HostWidget />
</template>

<style scoped>
:global(html),
:global(body),
:global(#app) {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background: transparent;
  overflow: hidden;
}
</style>
