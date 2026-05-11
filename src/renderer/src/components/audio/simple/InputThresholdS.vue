<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import gsap from 'gsap'

const props = defineProps<{
  sliderPercent: number
  isAutoGate: boolean
  thresholdDb: number
}>()

const emit = defineEmits<{
  (e: 'update:sliderPercent', value: number): void
}>()

const panelRef = ref<HTMLDivElement | null>(null)
const sliderRef = ref<HTMLInputElement | null>(null)
const valueRef = ref<HTMLSpanElement | null>(null)

const thresholdLabel = computed(() =>
  props.isAutoGate ? 'AUTO (Adaptacyjny)' : `${props.thresholdDb.toFixed(1)} dB`
)

const handleSliderInput = (event: Event): void => {
  const target = event.target as HTMLInputElement
  emit('update:sliderPercent', Number(target.value))
}

const handleSliderEnter = (): void => {
  if (!sliderRef.value) return
  gsap.to(sliderRef.value, {
    duration: 0.25,
    borderColor: '#481566',
    boxShadow: '0 0 0 1px rgba(72, 21, 102, 0.85), 0 0 16px rgba(72, 21, 102, 0.35)',
    ease: 'power2.out'
  })
}

const handleSliderLeave = (): void => {
  if (!sliderRef.value) return
  gsap.to(sliderRef.value, {
    duration: 0.25,
    borderColor: '#2d0f44',
    boxShadow: '0 0 0 0 rgba(72, 21, 102, 0)',
    ease: 'power2.out'
  })
}

onMounted(() => {
  if (panelRef.value) {
    gsap.from(panelRef.value, {
      duration: 0.42,
      opacity: 0,
      y: 10,
      ease: 'power2.out'
    })
  }

  sliderRef.value?.addEventListener('mouseenter', handleSliderEnter)
  sliderRef.value?.addEventListener('mouseleave', handleSliderLeave)
})

onUnmounted(() => {
  sliderRef.value?.removeEventListener('mouseenter', handleSliderEnter)
  sliderRef.value?.removeEventListener('mouseleave', handleSliderLeave)
})

watch(
  () => props.thresholdDb,
  () => {
    if (!valueRef.value) return
    gsap.fromTo(
      valueRef.value,
      { scale: 0.97, y: 0.5 },
      {
        scale: 1,
        y: 0,
        duration: 0.18,
        ease: 'power2.out',
        overwrite: true
      }
    )
  }
)
</script>

<template>
  <div ref="panelRef" class="rounded-md border border-[#2d0f44] bg-[#06001f]/75 p-2.5">
    <div class="mb-2 flex items-center justify-between">
      <span class="text-xs text-violet-200/85">Próg wejścia (Noise Gate)</span>
      <span
        ref="valueRef"
        class="text-xs font-mono font-bold"
        :class="isAutoGate ? 'text-emerald-400' : 'text-cyan-300'"
      >
        {{ thresholdLabel }}
      </span>
    </div>

    <input
      ref="sliderRef"
      :value="sliderPercent"
      type="range"
      min="0"
      max="100"
      step="0.5"
      class="input-threshold-slider w-full"
      :class="isAutoGate ? 'system' : 'monitor'"
      @input="handleSliderInput"
    />

    <p v-if="isAutoGate" class="mt-1 text-[10px] text-violet-300/55">
      Bramka automatycznie uczy sie poziomu szumu w Twoim pokoju.
    </p>
  </div>
</template>

<style scoped>
.input-threshold-slider {
  appearance: none;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, #06001f 0%, #18072f 55%, #481566 100%);
  border: 1px solid #3a1760;
  outline: none;
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease;
}

.input-threshold-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 2px solid #f5d0fe;
  cursor: pointer;
  transition: all 160ms ease;
}

.input-threshold-slider.monitor::-webkit-slider-thumb {
  background: #22d3ee;
  box-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
}

.input-threshold-slider.system::-webkit-slider-thumb {
  background: #34d399;
  box-shadow: 0 0 10px rgba(52, 211, 153, 0.5);
}

.input-threshold-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 2px solid #f5d0fe;
  border-radius: 999px;
  cursor: pointer;
}

.input-threshold-slider.monitor::-moz-range-thumb {
  background: #22d3ee;
}

.input-threshold-slider.system::-moz-range-thumb {
  background: #34d399;
}

.input-threshold-slider::-moz-range-track {
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, #06001f 0%, #18072f 55%, #481566 100%);
  border: 1px solid #3a1760;
}
</style>
