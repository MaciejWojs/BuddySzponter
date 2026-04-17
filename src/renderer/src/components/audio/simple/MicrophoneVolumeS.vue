<script setup lang="ts">
defineProps<{
  micVolumeSliderPercent: number
  myMicPercent: number
  isBoosting: boolean
  isMyMicMuted: boolean
}>()

const emit = defineEmits<{
  (e: 'update:micVolumeSliderPercent', value: number): void
  (e: 'toggle-mute'): void
}>()

const onSliderInput = (event: Event): void => {
  const target = event.target as HTMLInputElement
  emit('update:micVolumeSliderPercent', Number(target.value))
}
</script>

<template>
  <div class="mb-4">
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs text-gray-300">Glosnosc mikrofonu</span>
      <span
        class="text-xs font-mono font-semibold transition-colors"
        :class="isBoosting ? 'text-amber-400' : 'text-blue-400'"
      >
        {{ myMicPercent }}%
      </span>
    </div>

    <div class="flex items-center gap-3">
      <input
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
        type="button"
        class="h-9 w-9 rounded-md border text-xs font-bold transition-colors"
        :class="
          isMyMicMuted
            ? 'bg-rose-900/30 border-rose-700 text-rose-300'
            : 'bg-[#202020] border-[#3f3f3f] text-gray-200 hover:border-blue-500'
        "
        :title="isMyMicMuted ? 'Wlacz mikrofon' : 'Wycisz mikrofon'"
        @click="emit('toggle-mute')"
      >
        {{ isMyMicMuted ? '🎙️x' : '🎙️' }}
      </button>
    </div>
  </div>
</template>
