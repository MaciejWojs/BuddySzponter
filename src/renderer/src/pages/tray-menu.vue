<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import SessionTray from '@renderer/components/tray/session.vue'
import DefaultTray from '@renderer/components/tray/default.vue'

const rtcStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
const isMicMuted = ref(false)

let syncChannel: BroadcastChannel | null = null

onMounted(() => {
  syncChannel = new BroadcastChannel('guest-sync-channel')
  syncChannel.onmessage = (event) => {
    if (event.data.type === 'STATE_UPDATE') {
      rtcStatus.value = event.data.payload.rtcStatus
      isMicMuted.value = event.data.payload.microphoneMuted
    }
  }
  // Request initial state
  syncChannel.postMessage({ type: 'REQUEST_STATE' })
})

onUnmounted(() => {
  if (syncChannel) syncChannel.close()
})

const currentTrayView = computed(() => {
  return rtcStatus.value === 'connected' ? SessionTray : DefaultTray
})
</script>

<template>
  <component :is="currentTrayView" :is-mic-muted="isMicMuted" />
</template>
