<template>
  <div class="bu-timer">
    <span :style="{ fontSize: props.size ?? '16px' }">{{ formatted }}</span>
  </div>
</template>

<script setup lang="ts">
import { useCountdown } from '@vueuse/core'

const emit = defineEmits<{
  finish: []
  tick: [value: number]
}>()

const props = defineProps<{
  size?: string
  seconds?: number
}>()

const { remaining, pause, resume, isActive, start, stop } = useCountdown(props.seconds ?? 0, {
  onComplete: () => emit('finish'),
  onTick: () => emit('tick', remaining.value)
})

const formatted = computed(() => {
  const m = Math.floor(remaining.value / 60)
    .toString()
    .padStart(2, '0')
  const s = (remaining.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

function setTime(seconds: number): void {
  start(seconds)
}

defineExpose({ remaining, isActive, pause, resume, setTime, start, stop })
</script>

<style scoped>
.bu-timer {
  font-weight: normal;
  font-family: 'JetBrains Mono', monospace;
}
</style>
