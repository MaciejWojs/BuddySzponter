<script setup lang="ts">
interface DuckingPreset {
  id: 'balanced' | 'voice-focus' | 'aggressive' | 'stream'
  label: string
  hint: string
}

const props = defineProps<{
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
</script>

<template>
  <article class="mt-4 bg-[#161616] border border-[#333] rounded-lg p-4">
    <button
      type="button"
      class="w-full flex items-center justify-between text-left"
      @click="emit('toggle-advanced')"
    >
      <h3 class="text-sm font-bold text-amber-300">⚙️ Zaawansowane Ustawienia Duckingu</h3>
      <span class="text-xs text-amber-400">{{ props.isAdvancedOpen ? 'Ukryj' : 'Pokaz' }}</span>
    </button>

    <div v-if="props.isAdvancedOpen" class="mt-4 space-y-4">
      <div class="rounded-lg border border-[#3a3a3a] bg-[#111] p-3">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p class="text-xs text-gray-300">
            Presety Duckingu
            <span class="text-gray-500">(szybkie profile reakcji na mowę)</span>
          </p>
          <button
            type="button"
            class="px-3 py-1.5 rounded border border-[#505050] text-[11px] text-gray-300 hover:border-amber-500 hover:text-amber-300 transition-colors"
            @click="emit('reset-default')"
          >
            Reset do domyslnego
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          <button
            v-for="preset in props.duckingPresets"
            :key="preset.id"
            type="button"
            class="text-left rounded-md border px-3 py-2 transition-colors"
            :class="
              props.activePresetId === preset.id
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-[#3d3d3d] bg-[#1b1b1b] hover:border-amber-600/70'
            "
            @click="emit('apply-preset', preset.id)"
          >
            <p
              class="text-xs font-semibold"
              :class="props.activePresetId === preset.id ? 'text-amber-300' : 'text-gray-200'"
            >
              {{ preset.label }}
            </p>
            <p
              class="mt-1 text-[11px]"
              :class="props.activePresetId === preset.id ? 'text-amber-200/80' : 'text-gray-500'"
            >
              {{ preset.hint }}
            </p>
          </button>
        </div>

        <p class="mt-3 text-[11px] text-gray-500">
          Aktywny preset:
          <span class="text-amber-300 font-medium">{{ props.activePresetLabel ?? 'Custom' }}</span>
        </p>
      </div>

      <div
        class="grid grid-cols-1 lg:grid-cols-2 gap-4 rounded-lg border border-[#3a3a3a] bg-[#111] p-3"
      >
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-300">Sila wyciszenia (Ducking Level)</span>
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
            <span class="text-xs text-gray-300">Prog aktywacji (Threshold)</span>
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
            <span class="text-xs text-gray-300">Atak (Attack smoothing)</span>
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
            <span class="text-xs text-gray-300">Podtrzymanie (Hold Frames)</span>
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
  background: linear-gradient(90deg, #1f2937 0%, #374151 100%);
  border: 1px solid #3b3b3b;
  outline: none;
}

.pro-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #60a5fa;
  border: 2px solid #dbeafe;
  box-shadow: 0 0 10px rgba(96, 165, 250, 0.4);
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
  border: 2px solid #dbeafe;
  border-radius: 999px;
  background: #60a5fa;
  cursor: pointer;
}

.pro-slider::-moz-range-track {
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, #1f2937 0%, #374151 100%);
  border: 1px solid #3b3b3b;
}

.pro-slider.ducking::-moz-range-thumb {
  background: #f59e0b;
}
</style>
