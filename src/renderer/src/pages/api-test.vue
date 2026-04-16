<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import BuApiTestPanel from '@renderer/components/devComponents/BuApiTestPanel.vue'
import BuGuestVideo from '@renderer/components/devComponents/BuGuestVideo.vue'
import { useConnectionStore } from '@renderer/stores/connectionStore'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'

const connectionStore = useConnectionStore()
const webRtcStore = useWebRtcStore()

const isRtcConnected = computed(() => webRtcStore.rtcStatus === 'connected')
const isHostConnected = computed(() => connectionStore.isHost && isRtcConnected.value)
const isGuestConnected = computed(() => !connectionStore.isHost && isRtcConnected.value)

const syncWindowMode = async (hostActive: boolean): Promise<void> => {
  try {
    if (hostActive) {
      await window.api.app.showHostWidget()
    } else {
      await window.api.app.hideHostWidget()
    }
  } catch (error) {
    console.warn('[SyncWindowMode] Nie udało się zsynchronizować widgetu:', error)
  }
}

watch(
  isHostConnected,
  (hostActive) => {
    void syncWindowMode(hostActive)
  },
  { immediate: true }
)

onUnmounted(() => {
  window.api.app.hideHostWidget().catch(() => {})
})
</script>

<template>
  <BuGuestVideo v-if="isGuestConnected" />
  <BuApiTestPanel />
</template>
