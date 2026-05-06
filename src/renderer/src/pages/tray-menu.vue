<script setup lang="ts">
import { computed } from 'vue'
import { useTraySync } from '@renderer/composables/syncWindow/useTraySync'
import DefaultTray from '@renderer/components/tray/default.vue'

const { isMicMuted, connectionCode } = useTraySync()

const currentTrayView = computed(() => {
  return DefaultTray
})
</script>

<template>
  <component :is="currentTrayView" :is-mic-muted="isMicMuted" :connection-code="connectionCode" />
</template>
