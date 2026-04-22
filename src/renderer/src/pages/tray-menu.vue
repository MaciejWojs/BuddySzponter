<script setup lang="ts">
import { computed } from 'vue'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import SessionTray from '@renderer/components/tray/session.vue'
import DefaultTray from '@renderer/components/tray/default.vue'

const currentTrayView = computed(() => {
  return useWebRtcStore().rtcStatus === 'connected' ? SessionTray : DefaultTray
})
</script>

<template>
  <component :is="currentTrayView" />
</template>
