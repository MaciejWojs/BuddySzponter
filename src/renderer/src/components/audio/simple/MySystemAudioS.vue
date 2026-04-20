<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import gsap from 'gsap'

const props = defineProps<{
  mySystemPercent: number
  isMySystemMuted: boolean
}>()

const emit = defineEmits<{
  (e: 'update:my-system-percent', value: number): void
  (e: 'toggle-mute'): void
}>()

const handleSliderInput = (event: Event): void => {
  const target = event.target as HTMLInputElement
  emit('update:my-system-percent', Number(target.value))
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

const handleToggleMute = (): void => {
  if (muteButtonRef.value) {
    gsap.fromTo(
      muteButtonRef.value,
      { scale: 0.96 },
      { scale: 1, duration: 0.16, ease: 'power2.out' }
    )
  }
  emit('toggle-mute')
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
      <span class="text-xs text-violet-200/85">Moje audio systemowe</span>
      <span class="text-xs font-mono font-semibold text-emerald-300"
        >{{ props.mySystemPercent }}%</span
      >
    </div>

    <div class="flex items-center gap-3">
      <input
        ref="sliderRef"
        :value="props.mySystemPercent"
        type="range"
        min="0"
        max="100"
        step="1"
        class="pro-slider system flex-1"
        @input="handleSliderInput"
      />
      <button
        ref="muteButtonRef"
        type="button"
        class="h-9 w-9 rounded-md border text-xs font-bold transition-all duration-200"
        :class="
          props.isMySystemMuted
            ? 'bg-[#2A0C3B] border-[#7F2DAA] text-fuchsia-200'
            : 'bg-[#06001F] border-[#481566] text-violet-100 hover:border-[#6C2A92]'
        "
        :title="props.isMySystemMuted ? 'Wlacz system audio' : 'Wycisz system audio'"
        @click="handleToggleMute"
      >
        {{ props.isMySystemMuted ? '🔇' : '🔊' }}
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
  border: 2px solid #d1fae5;
  cursor: pointer;
  transition: all 160ms ease;
}

.pro-slider.system::-webkit-slider-thumb {
  background: #34d399;
  box-shadow: 0 0 10px rgba(52, 211, 153, 0.5);
}

.pro-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 2px solid #d1fae5;
  border-radius: 999px;
  background: #34d399;
  box-shadow: 0 0 10px rgba(52, 211, 153, 0.45);
  cursor: pointer;
}

.pro-slider::-moz-range-track {
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, #06001f 0%, #1a0830 55%, #481566 100%);
  border: 1px solid #3a1760;
}
</style>
