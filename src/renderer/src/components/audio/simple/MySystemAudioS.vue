<script setup lang="ts">
defineProps<{
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
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs text-gray-300">Moje audio systemowe</span>
      <span class="text-xs font-mono text-emerald-400">{{ mySystemPercent }}%</span>
    </div>

    <div class="flex items-center gap-3">
      <input
        :value="mySystemPercent"
        type="range"
        min="0"
        max="100"
        step="1"
        class="pro-slider system flex-1"
        @input="handleSliderInput"
      />
      <button
        type="button"
        class="h-9 w-9 rounded-md border text-xs font-bold transition-colors"
        :class="
          isMySystemMuted
            ? 'bg-rose-900/30 border-rose-700 text-rose-300'
            : 'bg-[#202020] border-[#3f3f3f] text-gray-200 hover:border-emerald-500'
        "
        :title="isMySystemMuted ? 'Wlacz system audio' : 'Wycisz system audio'"
        @click="emit('toggle-mute')"
      >
        {{ isMySystemMuted ? '🔇' : '🔊' }}
      </button>
    </div>
  </div>
</template>
