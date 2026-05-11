<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import gsap from 'gsap'

const props = defineProps<{
  guestMicPercent: number
  guestSystemPercent: number
  isGuestSystemMuted: boolean
}>()

const emit = defineEmits<{
  (e: 'update:guest-mic-percent', value: number): void
  (e: 'update:guest-system-percent', value: number): void
  (e: 'toggle-guest-system-mute'): void
}>()

const handleGuestMicInput = (event: Event): void => {
  const target = event.target as HTMLInputElement
  emit('update:guest-mic-percent', Number(target.value))
}

const handleGuestSystemInput = (event: Event): void => {
  const target = event.target as HTMLInputElement
  emit('update:guest-system-percent', Number(target.value))
}

const panelRef = ref<HTMLElement | null>(null)
const micSliderRef = ref<HTMLInputElement | null>(null)
const systemSliderRef = ref<HTMLInputElement | null>(null)
const muteButtonRef = ref<HTMLButtonElement | null>(null)

const handleSliderEnter = (slider: HTMLInputElement | null): void => {
  if (!slider) return
  gsap.to(slider, {
    duration: 0.25,
    boxShadow: '0 0 0 1px rgba(72, 21, 102, 0.85), 0 0 18px rgba(72, 21, 102, 0.45)',
    ease: 'power2.out'
  })
}

const handleSliderLeave = (slider: HTMLInputElement | null): void => {
  if (!slider) return
  gsap.to(slider, {
    duration: 0.25,
    boxShadow: '0 0 0 0 rgba(72, 21, 102, 0)',
    ease: 'power2.out'
  })
}

const onMicSliderEnter = (): void => handleSliderEnter(micSliderRef.value)
const onMicSliderLeave = (): void => handleSliderLeave(micSliderRef.value)
const onSystemSliderEnter = (): void => handleSliderEnter(systemSliderRef.value)
const onSystemSliderLeave = (): void => handleSliderLeave(systemSliderRef.value)

const handleMuteButtonEnter = (): void => {
  if (!muteButtonRef.value) return
  gsap.to(muteButtonRef.value, {
    duration: 0.22,
    y: -1,
    scale: 1.03,
    boxShadow: '0 6px 18px rgba(72, 21, 102, 0.35)',
    ease: 'power2.out'
  })
}

const handleMuteButtonLeave = (): void => {
  if (!muteButtonRef.value) return
  gsap.to(muteButtonRef.value, {
    duration: 0.22,
    y: 0,
    scale: 1,
    boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
    ease: 'power2.out'
  })
}

const handleToggleGuestSystemMute = (): void => {
  if (muteButtonRef.value) {
    gsap.fromTo(
      muteButtonRef.value,
      { scale: 0.96 },
      { scale: 1, duration: 0.16, ease: 'power2.out' }
    )
  }
  emit('toggle-guest-system-mute')
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

  micSliderRef.value?.addEventListener('mouseenter', onMicSliderEnter)
  micSliderRef.value?.addEventListener('mouseleave', onMicSliderLeave)
  systemSliderRef.value?.addEventListener('mouseenter', onSystemSliderEnter)
  systemSliderRef.value?.addEventListener('mouseleave', onSystemSliderLeave)
  muteButtonRef.value?.addEventListener('mouseenter', handleMuteButtonEnter)
  muteButtonRef.value?.addEventListener('mouseleave', handleMuteButtonLeave)
})

onUnmounted(() => {
  micSliderRef.value?.removeEventListener('mouseenter', onMicSliderEnter)
  micSliderRef.value?.removeEventListener('mouseleave', onMicSliderLeave)
  systemSliderRef.value?.removeEventListener('mouseenter', onSystemSliderEnter)
  systemSliderRef.value?.removeEventListener('mouseleave', onSystemSliderLeave)
  muteButtonRef.value?.removeEventListener('mouseenter', handleMuteButtonEnter)
  muteButtonRef.value?.removeEventListener('mouseleave', handleMuteButtonLeave)
})
</script>

<template>
  <article
    ref="panelRef"
    class="rounded-lg border border-[#2d0f44] bg-[#06001f] p-4 shadow-[0_10px_26px_rgba(3,0,18,0.45)]"
  >
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-bold text-cyan-300">🎧 Odsluch (Lokalny mikser)</h3>
    </div>

    <div class="mb-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-violet-200/85 flex items-center gap-2">
          Mikrofon Goscia
          <span
            class="inline-flex h-4 w-4 items-center justify-center rounded-full border border-cyan-600 text-cyan-300 text-[10px]"
            title="Dzwiek scisza sie automatycznie, gdy Gosc mowi (Audio Ducking)."
            >i</span
          >
        </span>
        <span class="text-xs font-mono font-semibold text-cyan-300"
          >{{ props.guestMicPercent }}%</span
        >
      </div>
      <p class="text-[11px] text-violet-300/55 mb-2">
        Dzwiek scisza sie automatycznie, gdy Gosc mowi (Audio Ducking).
      </p>
      <input
        ref="micSliderRef"
        :value="props.guestMicPercent"
        type="range"
        min="0"
        max="100"
        step="1"
        class="pro-slider monitor w-full"
        @input="handleGuestMicInput"
      />
    </div>

    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-violet-200/85">System Goscia</span>
        <span class="text-xs font-mono font-semibold text-fuchsia-300"
          >{{ props.guestSystemPercent }}%</span
        >
      </div>
      <div class="flex items-center gap-3">
        <input
          ref="systemSliderRef"
          :value="props.guestSystemPercent"
          type="range"
          min="0"
          max="100"
          step="1"
          class="pro-slider guest-system flex-1"
          @input="handleGuestSystemInput"
        />
        <button
          ref="muteButtonRef"
          type="button"
          class="h-9 w-9 rounded-md border text-xs font-bold transition-all duration-200"
          :class="
            props.isGuestSystemMuted
              ? 'bg-[#2A0C3B] border-[#7F2DAA] text-fuchsia-200'
              : 'bg-[#06001F] border-[#481566] text-violet-100 hover:border-[#6C2A92]'
          "
          :title="props.isGuestSystemMuted ? 'Wlacz system Goscia' : 'Wycisz system Goscia'"
          @click="handleToggleGuestSystemMute"
        >
          {{ props.isGuestSystemMuted ? '🔇' : '🔊' }}
        </button>
      </div>
    </div>
  </article>
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
  border: 2px solid #f5d0fe;
  cursor: pointer;
  transition: all 160ms ease;
}

.pro-slider.monitor::-webkit-slider-thumb {
  background: #22d3ee;
  box-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
}

.pro-slider.guest-system::-webkit-slider-thumb {
  background: #e879f9;
  box-shadow: 0 0 10px rgba(232, 121, 249, 0.45);
}

.pro-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 2px solid #f5d0fe;
  border-radius: 999px;
  background: #22d3ee;
  box-shadow: 0 0 10px rgba(34, 211, 238, 0.45);
  cursor: pointer;
}

.pro-slider::-moz-range-track {
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, #06001f 0%, #1a0830 55%, #481566 100%);
  border: 1px solid #3a1760;
}

.pro-slider.monitor::-moz-range-thumb {
  background: #22d3ee;
}

.pro-slider.guest-system::-moz-range-thumb {
  background: #e879f9;
}
</style>
