<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import MySystemAudioS from '../simple/MySystemAudioS.vue'

const webRtcStore = useWebRtcStore()
const isMySystemMuted = ref(false)

const mySystemPercent = computed<number>({
  get: () => Math.round(webRtcStore.localSystemAudioVolume * 100),
  set: (value) => {
    webRtcStore.localSystemAudioVolume = Math.max(0, Math.min(1, value / 100))
  }
})

const toggleMySystemMute = (): void => {
  isMySystemMuted.value = !isMySystemMuted.value
  webRtcStore.toggleSystemAudio(isMySystemMuted.value)
}

const handleSystemPercentChange = (value: number): void => {
  mySystemPercent.value = value
}
</script>

<template>
  <MySystemAudioS
    :my-system-percent="mySystemPercent"
    :is-my-system-muted="isMySystemMuted"
    @update:my-system-percent="handleSystemPercentChange"
    @toggle-mute="toggleMySystemMute"
  />
</template>
