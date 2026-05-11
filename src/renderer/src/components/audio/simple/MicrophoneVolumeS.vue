<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import gsap from 'gsap'

defineProps<{
  micVolumeSliderPercent: number
  myMicPercent: number
  isBoosting: boolean
  isMyMicMuted: boolean
}>()

const emit = defineEmits<{
  (e: 'update:mic-volume-slider-percent', value: number): void
  (e: 'toggle-mute'): void
}>()

const onSliderInput = (event: Event): void => {
  const target = event.target as HTMLInputElement
  emit('update:mic-volume-slider-percent', Number(target.value))
}

const panelRef = ref<HTMLDivElement | null>(null)
const sliderRef = ref<HTMLInputElement | null>(null)
const muteButtonRef = ref<HTMLButtonElement | null>(null)

const handleSliderEnter = (): void => {
  if (!sliderRef.value) return
  gsap.to(sliderRef.value, {
    duration: 0.25,
    boxShadow: '0 0 0 1px rgba(72, 21, 102, 0.85), 0 0 18px rgba(72, 21, 102, 0.45)',
    ease: 'power2.out'
  })
}

const handleSliderLeave = (): void => {
  if (!sliderRef.value) return
  gsap.to(sliderRef.value, {
    duration: 0.25,
    boxShadow: '0 0 0 0 rgba(72, 21, 102, 0)',
    ease: 'power2.out'
  })
}

const handleButtonEnter = (): void => {
  if (!muteButtonRef.value) return
  gsap.to(muteButtonRef.value, {
    duration: 0.22,
    y: -1,
    scale: 1.03,
    boxShadow: '0 6px 18px rgba(72, 21, 102, 0.35)',
    ease: 'power2.out'
  })
}

const handleButtonLeave = (): void => {
  if (!muteButtonRef.value) return
  gsap.to(muteButtonRef.value, {
    duration: 0.22,
    y: 0,
    scale: 1,
    boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
    ease: 'power2.out'
  })
}

onMounted(() => {
  if (panelRef.value) {
    gsap.from(panelRef.value, {
      duration: 0.5,
      opacity: 0,
      y: 14,
      ease: 'power2.out'
    })
  }

  sliderRef.value?.addEventListener('mouseenter', handleSliderEnter)
  sliderRef.value?.addEventListener('mouseleave', handleSliderLeave)
  muteButtonRef.value?.addEventListener('mouseenter', handleButtonEnter)
  muteButtonRef.value?.addEventListener('mouseleave', handleButtonLeave)
})

onUnmounted(() => {
  sliderRef.value?.removeEventListener('mouseenter', handleSliderEnter)
  sliderRef.value?.removeEventListener('mouseleave', handleSliderLeave)
  muteButtonRef.value?.removeEventListener('mouseenter', handleButtonEnter)
  muteButtonRef.value?.removeEventListener('mouseleave', handleButtonLeave)
})
</script>

<template>
  <div ref="panelRef" class="mb-4">
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs text-violet-200/85">Glosnosc mikrofonu</span>
      <span
        class="text-xs font-mono font-semibold transition-colors"
        :class="isBoosting ? 'text-fuchsia-300' : 'text-violet-300'"
      >
        {{ myMicPercent }}%
      </span>
    </div>

    <div class="flex items-center gap-3">
      <input
        ref="sliderRef"
        :value="micVolumeSliderPercent"
        type="range"
        min="0"
        max="100"
        step="1"
        class="pro-slider flex-1"
        :class="isBoosting ? 'boost' : 'normal'"
        @input="onSliderInput"
      />
      <button
        ref="muteButtonRef"
        type="button"
        class="h-9 w-9 rounded-md border text-xs font-bold transition-all duration-200"
        :class="
          isMyMicMuted
            ? 'bg-[#2A0C3B] border-[#7F2DAA] text-fuchsia-200'
            : 'bg-[#06001F] border-[#481566] text-violet-100 hover:border-[#6C2A92]'
        "
        :title="isMyMicMuted ? 'Wlacz mikrofon' : 'Wycisz mikrofon'"
        @click="emit('toggle-mute')"
      >
        {{ isMyMicMuted ? '🎙️x' : '🎙️' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.pro-slider {
  appearance: none;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, #06001f 0%, #1a0830 55%, #481566 100%);
  border: 1px solid #3a1760;
  outline: none;
  transition: box-shadow 180ms ease;
}

.pro-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #c084fc;
  border: 2px solid #f5d0fe;
  box-shadow: 0 0 10px rgba(192, 132, 252, 0.5);
  cursor: pointer;
  transition: all 160ms ease;
}

.pro-slider.normal::-webkit-slider-thumb {
  background: #c084fc;
  box-shadow: 0 0 10px rgba(192, 132, 252, 0.55);
}

.pro-slider.boost::-webkit-slider-thumb {
  background: #f0abfc;
  box-shadow: 0 0 12px rgba(240, 171, 252, 0.7);
}

.pro-slider.boost {
  background: linear-gradient(90deg, #120027 0%, #3a0f5a 60%, #6a1b9a 100%);
}

.pro-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 2px solid #f5d0fe;
  border-radius: 999px;
  background: #c084fc;
  box-shadow: 0 0 10px rgba(192, 132, 252, 0.45);
  cursor: pointer;
}

.pro-slider::-moz-range-track {
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, #06001f 0%, #1a0830 55%, #481566 100%);
  border: 1px solid #3a1760;
}

.pro-slider.boost::-moz-range-thumb {
  background: #f0abfc;
  box-shadow: 0 0 12px rgba(240, 171, 252, 0.65);
}
</style>
