<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import gsap from 'gsap'

interface DuckingPreset {
  id: 'balanced' | 'voice-focus' | 'aggressive' | 'stream'
  label: string
  hint: string
}

const props = defineProps<{
  compact?: boolean
  isAdvancedOpen: boolean
  duckingPresets: DuckingPreset[]
  activePresetId: DuckingPreset['id'] | null
  activePresetLabel: string | null
  audioDuckingLevel: number
  audioSpeechThreshold: number
  audioGainSmoothing: number
  audioHoldFrames: number
}>()

const emit = defineEmits<{
  (e: 'toggle-advanced'): void
  (e: 'reset-default'): void
  (e: 'apply-preset', presetId: DuckingPreset['id']): void
  (e: 'update:audio-ducking-level', value: number): void
  (e: 'update:audio-speech-threshold', value: number): void
  (e: 'update:audio-gain-smoothing', value: number): void
  (e: 'update:audio-hold-frames', value: number): void
}>()

const toNumber = (event: Event): number => {
  const target = event.target as HTMLInputElement
  return Number(target.value)
}

const onAudioDuckingLevelInput = (event: Event): void => {
  emit('update:audio-ducking-level', toNumber(event))
}

const onAudioSpeechThresholdInput = (event: Event): void => {
  emit('update:audio-speech-threshold', toNumber(event))
}

const onAudioGainSmoothingInput = (event: Event): void => {
  emit('update:audio-gain-smoothing', toNumber(event))
}

const onAudioHoldFramesInput = (event: Event): void => {
  emit('update:audio-hold-frames', toNumber(event))
}

const articleRef = ref<HTMLElement | null>(null)
const advancedContentRef = ref<HTMLDivElement | null>(null)

const animateButtonEnter = (event: MouseEvent): void => {
  const button = event.currentTarget as HTMLButtonElement | null
  if (!button) return

  gsap.to(button, {
    duration: 0.2,
    y: -1,
    scale: 1.01,
    boxShadow: '0 8px 18px rgba(72, 21, 102, 0.28)',
    ease: 'power2.out'
  })
}

const animateButtonLeave = (event: MouseEvent): void => {
  const button = event.currentTarget as HTMLButtonElement | null
  if (!button) return

  gsap.to(button, {
    duration: 0.2,
    y: 0,
    scale: 1,
    boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
    ease: 'power2.out'
  })
}

const animateButtonClick = (event: MouseEvent): void => {
  const button = event.currentTarget as HTMLButtonElement | null
  if (!button) return

  gsap.fromTo(
    button,
    { scale: 0.97 },
    {
      scale: 1,
      duration: 0.16,
      ease: 'power2.out'
    }
  )
}

const handleToggleAdvanced = (event: MouseEvent): void => {
  animateButtonClick(event)
  emit('toggle-advanced')
}

const handleResetDefault = (event: MouseEvent): void => {
  animateButtonClick(event)
  emit('reset-default')
}

const handleApplyPreset = (presetId: DuckingPreset['id'], event: MouseEvent): void => {
  animateButtonClick(event)
  emit('apply-preset', presetId)
}

onMounted(() => {
  if (articleRef.value) {
    gsap.from(articleRef.value, {
      duration: 0.5,
      opacity: 0,
      y: 14,
      ease: 'power2.out'
    })
  }
})

watch(
  () => props.isAdvancedOpen,
  async (isOpen) => {
    if (!isOpen) return

    await nextTick()
    if (!advancedContentRef.value) return

    gsap.from(advancedContentRef.value, {
      duration: 0.32,
      opacity: 0,
      y: 8,
      ease: 'power2.out'
    })

    const presetButtons = advancedContentRef.value.querySelectorAll('[data-preset-button]')
    if (presetButtons.length > 0) {
      gsap.from(presetButtons, {
        duration: 0.26,
        opacity: 0,
        y: 6,
        stagger: 0.03,
        ease: 'power2.out'
      })
    }
  }
)
</script>

<template>
  <article
    ref="articleRef"
    class="mt-4 rounded-lg border border-[#2d0f44] bg-[#06001f] p-4 shadow-[0_10px_26px_rgba(3,0,18,0.45)]"
  >
    <button
      type="button"
      class="w-full flex items-center justify-between text-left"
      @mouseenter="animateButtonEnter"
      @mouseleave="animateButtonLeave"
      @click="handleToggleAdvanced"
    >
      <h3 class="text-sm font-bold text-amber-300">
        {{ props.compact ? '⚙️ Ducking' : '⚙️ Zaawansowane Ustawienia Duckingu' }}
      </h3>
      <span class="text-xs text-amber-400">{{ props.isAdvancedOpen ? 'Ukryj' : 'Pokaz' }}</span>
    </button>

    <div v-if="props.isAdvancedOpen" ref="advancedContentRef" class="mt-4 space-y-4">
      <div class="rounded-lg border border-[#2d0f44] bg-[#090223] p-3">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p class="text-xs text-violet-200/85">
            Presety Duckingu
            <span v-if="!props.compact" class="text-violet-300/55"
              >(szybkie profile reakcji na mowę)</span
            >
          </p>
          <button
            type="button"
            class="rounded border border-[#3a1760] bg-[#0d0426] px-3 py-1.5 text-[11px] text-violet-200/80 transition-colors hover:border-amber-500 hover:text-amber-200"
            @mouseenter="animateButtonEnter"
            @mouseleave="animateButtonLeave"
            @click="handleResetDefault"
          >
            Reset do domyslnego
          </button>
        </div>

        <div
          class="grid gap-2"
          :class="props.compact ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'"
        >
          <button
            v-for="preset in props.duckingPresets"
            :key="preset.id"
            data-preset-button
            type="button"
            class="text-left rounded-md border px-3 py-2 transition-colors"
            :title="preset.hint"
            :class="
              props.activePresetId === preset.id
                ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : 'border-[#3a1760] bg-[#0d0426] hover:border-amber-600/70'
            "
            @mouseenter="animateButtonEnter"
            @mouseleave="animateButtonLeave"
            @click="handleApplyPreset(preset.id, $event)"
          >
            <p
              class="text-xs font-semibold"
              :class="props.activePresetId === preset.id ? 'text-amber-200' : 'text-violet-200/85'"
            >
              {{ preset.label }}
            </p>
            <p
              v-if="!props.compact"
              class="mt-1 text-[11px]"
              :class="
                props.activePresetId === preset.id ? 'text-amber-200/80' : 'text-violet-300/55'
              "
            >
              {{ preset.hint }}
            </p>
          </button>
        </div>

        <p class="mt-3 text-[11px] text-violet-300/55">
          Aktywny preset:
          <span class="text-amber-300 font-medium">{{ props.activePresetLabel ?? 'Custom' }}</span>
        </p>
      </div>

      <div
        class="grid grid-cols-1 gap-4 rounded-lg border border-[#2d0f44] bg-[#090223] p-3"
        :class="!props.compact ? 'lg:grid-cols-2' : ''"
      >
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-violet-200/85">Sila wyciszenia (Ducking Level)</span>
            <span class="text-xs font-mono text-amber-300">{{
              props.audioDuckingLevel.toFixed(2)
            }}</span>
          </div>
          <input
            :value="props.audioDuckingLevel"
            class="pro-slider ducking w-full"
            type="range"
            min="0"
            max="1"
            step="0.01"
            @input="onAudioDuckingLevelInput"
          />
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-violet-200/85">Prog aktywacji (Threshold)</span>
            <span class="text-xs font-mono text-amber-300">{{
              props.audioSpeechThreshold.toFixed(3)
            }}</span>
          </div>
          <input
            :value="props.audioSpeechThreshold"
            class="pro-slider ducking w-full"
            type="range"
            min="0"
            max="0.1"
            step="0.001"
            @input="onAudioSpeechThresholdInput"
          />
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-violet-200/85">Atak (Attack smoothing)</span>
            <span class="text-xs font-mono text-amber-300"
              >{{ props.audioGainSmoothing.toFixed(2) }} s</span
            >
          </div>
          <input
            :value="props.audioGainSmoothing"
            class="pro-slider ducking w-full"
            type="range"
            min="0.01"
            max="0.5"
            step="0.01"
            @input="onAudioGainSmoothingInput"
          />
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-violet-200/85">Podtrzymanie (Hold Frames)</span>
            <span class="text-xs font-mono text-amber-300">{{ props.audioHoldFrames }} klatek</span>
          </div>
          <input
            :value="props.audioHoldFrames"
            class="pro-slider ducking w-full"
            type="range"
            min="0"
            max="30"
            step="1"
            @input="onAudioHoldFramesInput"
          />
        </div>
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
  border: 2px solid #fde68a;
  cursor: pointer;
  transition: all 160ms ease;
}

.pro-slider.ducking::-webkit-slider-thumb {
  background: #f59e0b;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.45);
}

.pro-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 2px solid #fde68a;
  border-radius: 999px;
  background: #f59e0b;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.45);
  cursor: pointer;
}

.pro-slider::-moz-range-track {
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, #06001f 0%, #1a0830 55%, #481566 100%);
  border: 1px solid #3a1760;
}

.pro-slider.ducking::-moz-range-thumb {
  background: #f59e0b;
}
</style>
