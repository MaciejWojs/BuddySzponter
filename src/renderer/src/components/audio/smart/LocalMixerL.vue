<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import LocalMixerS from '../simple/LocalMixerS.vue'

const webRtcStore = useWebRtcStore()

const guestMicPercent = computed<number>({
  get: () => Math.round(webRtcStore.remoteMicVolume * 100),
  set: (value) => {
    webRtcStore.remoteMicVolume = Math.max(0, Math.min(1, value / 100))
  }
})

const guestSystemPercent = computed<number>({
  get: () => Math.round(webRtcStore.remoteSystemVolume * 100),
  set: (value) => {
    webRtcStore.remoteSystemVolume = Math.max(0, Math.min(1, value / 100))
  }
})

const isGuestSystemMuted = ref(false)

const toggleGuestSystemMute = (): void => {
  isGuestSystemMuted.value = !isGuestSystemMuted.value
  webRtcStore.remoteSystemVolume = isGuestSystemMuted.value ? 0 : 1
}

const handleGuestMicPercentChange = (value: number): void => {
  guestMicPercent.value = value
}

const handleGuestSystemPercentChange = (value: number): void => {
  guestSystemPercent.value = value
}
</script>

<template>
  <LocalMixerS
    :guest-mic-percent="guestMicPercent"
    :guest-system-percent="guestSystemPercent"
    :is-guest-system-muted="isGuestSystemMuted"
    @update:guest-mic-percent="handleGuestMicPercentChange"
    @update:guest-system-percent="handleGuestSystemPercentChange"
    @toggle-guest-system-mute="toggleGuestSystemMute"
  />
</template>
