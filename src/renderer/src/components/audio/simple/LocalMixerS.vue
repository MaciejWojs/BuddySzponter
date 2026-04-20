<script setup lang="ts">
defineProps<{
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
</script>

<template>
  <article class="bg-[#161616] border border-[#333] rounded-lg p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-bold text-cyan-300">🎧 Odsluch (Lokalny mikser)</h3>
    </div>

    <div class="mb-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-gray-300 flex items-center gap-2">
          Mikrofon Goscia
          <span
            class="inline-flex h-4 w-4 items-center justify-center rounded-full border border-cyan-700 text-cyan-400 text-[10px]"
            title="Dzwiek scisza sie automatycznie, gdy Gosc mowi (Audio Ducking)."
            >i</span
          >
        </span>
        <span class="text-xs font-mono text-cyan-400">{{ guestMicPercent }}%</span>
      </div>
      <p class="text-[11px] text-gray-500 mb-2">
        Dzwiek scisza sie automatycznie, gdy Gosc mowi (Audio Ducking).
      </p>
      <input
        :value="guestMicPercent"
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
        <span class="text-xs text-gray-300">System Goscia</span>
        <span class="text-xs font-mono text-fuchsia-300">{{ guestSystemPercent }}%</span>
      </div>
      <div class="flex items-center gap-3">
        <input
          :value="guestSystemPercent"
          type="range"
          min="0"
          max="100"
          step="1"
          class="pro-slider guest-system flex-1"
          @input="handleGuestSystemInput"
        />
        <button
          type="button"
          class="h-9 w-9 rounded-md border text-xs font-bold transition-colors"
          :class="
            isGuestSystemMuted
              ? 'bg-rose-900/30 border-rose-700 text-rose-300'
              : 'bg-[#202020] border-[#3f3f3f] text-gray-200 hover:border-fuchsia-500'
          "
          :title="isGuestSystemMuted ? 'Wlacz system Goscia' : 'Wycisz system Goscia'"
          @click="emit('toggle-guest-system-mute')"
        >
          {{ isGuestSystemMuted ? '🔇' : '🔊' }}
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

.pro-slider.monitor::-moz-range-thumb {
  background: #22d3ee;
}

.pro-slider.guest-system::-moz-range-thumb {
  background: #e879f9;
}
</style>
