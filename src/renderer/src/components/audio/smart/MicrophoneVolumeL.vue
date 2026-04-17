<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import MicrophoneVolumeS from '../simple/MicrophoneVolumeS.vue'

const emit = defineEmits<{
  (e: 'mute-state-change', value: boolean): void
}>()

const webRtcStore = useWebRtcStore()
const { localMicrophoneVolume, localStream } = storeToRefs(webRtcStore)

const mapValueToSinePercent = (value: number, min: number, max: number): number => {
  const clampUnit = (val: number): number => Math.max(0, Math.min(1, val))
  const inverseEaseInOutSine = (val: number): number => Math.acos(1 - 2 * clampUnit(val)) / Math.PI
  if (max <= min) return 0
  const normalized = clampUnit((value - min) / (max - min))
  return inverseEaseInOutSine(normalized) * 100
}

const mapSinePercentToValue = (percent: number, min: number, max: number): number => {
  const clampUnit = (val: number): number => Math.max(0, Math.min(1, val))
  const easeInOutSine = (val: number): number => 0.5 - Math.cos(Math.PI * clampUnit(val)) / 2
  if (max <= min) return min
  return min + easeInOutSine(percent / 100) * (max - min)
}

const micVolumeSliderPercent = computed({
  get: () => mapValueToSinePercent(localMicrophoneVolume.value, 0, 2),
  set: (value: number) => {
    localMicrophoneVolume.value = mapSinePercentToValue(value, 0, 2)
  }
})

const myMicPercent = computed(() => Math.round(localMicrophoneVolume.value * 100))
const isBoosting = computed(() => myMicPercent.value > 100)

const isMyMicMuted = computed(() => {
  if (!localStream.value) return false
  const micTrack =
    localStream.value.getAudioTracks().find((track) => track.contentHint === 'speech') ??
    localStream.value.getAudioTracks()[0]
  return micTrack ? !micTrack.enabled : false
})

const toggleMyMicMute = (): void => {
  webRtcStore.toggleMicrophone(!isMyMicMuted.value)
}

watch(
  isMyMicMuted,
  (muted) => {
    emit('mute-state-change', muted)
  },
  { immediate: true }
)
</script>

<template>
  <MicrophoneVolumeS
    :mic-volume-slider-percent="micVolumeSliderPercent"
    :my-mic-percent="myMicPercent"
    :is-boosting="isBoosting"
    :is-my-mic-muted="isMyMicMuted"
    @update:mic-volume-slider-percent="micVolumeSliderPercent = $event"
    @toggle-mute="toggleMyMicMute"
  />
</template>
