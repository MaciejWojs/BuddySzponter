<script setup lang="ts">
interface VoicePreset {
  id: string
  label: string
}

defineProps<{
  micLimiterEnabled: boolean
  micBassBoostEnabled: boolean
  micStudioModeEnabled: boolean
  micMonitoringEnabled: boolean
  voicePresets: VoicePreset[]
  activeVoicePreset: string
}>()

const emit = defineEmits<{
  (e: 'toggle-limiter'): void
  (e: 'toggle-bass-boost'): void
  (e: 'toggle-studio-mode'): void
  (e: 'toggle-monitoring'): void
  (e: 'select-voice-preset', presetId: string): void
}>()
</script>

<template>
  <div class="rounded-md border border-[#3a3a3a] bg-[#111] p-3">
    <p class="text-xs text-gray-300 mb-3">Efekty mikrofonu</p>

    <div class="flex flex-wrap items-center gap-2 mb-3">
      <button
        type="button"
        class="px-3 py-1.5 rounded border text-[11px] transition-colors"
        :class="
          micLimiterEnabled
            ? 'border-amber-500 bg-amber-500/15 text-amber-300'
            : 'border-[#4a4a4a] text-gray-300 hover:border-amber-500/60'
        "
        @click="emit('toggle-limiter')"
      >
        Limiter {{ micLimiterEnabled ? 'ON' : 'OFF' }}
      </button>

      <button
        type="button"
        class="px-3 py-1.5 rounded border text-[11px] transition-colors"
        :class="
          micBassBoostEnabled
            ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
            : 'border-[#4a4a4a] text-gray-300 hover:border-indigo-500/60'
        "
        @click="emit('toggle-bass-boost')"
      >
        Radiowy Bas {{ micBassBoostEnabled ? 'ON' : 'OFF' }}
      </button>

      <button
        type="button"
        class="px-3 py-1.5 rounded border text-[11px] transition-colors relative group"
        :class="
          micStudioModeEnabled
            ? 'border-fuchsia-500 bg-fuchsia-500/15 text-fuchsia-300'
            : 'border-[#4a4a4a] text-gray-300 hover:border-fuchsia-500/60'
        "
        @click="emit('toggle-studio-mode')"
      >
        Tryb Studio {{ micStudioModeEnabled ? 'ON' : 'OFF' }}
        <div
          class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-black border border-gray-700 text-gray-300 text-[10px] rounded shadow-lg z-10 whitespace-normal text-center"
        >
          Wylacza obrobke przegladarki dla maksymalnej jakosci. Uzywaj tylko w sluchawkach!
        </div>
      </button>

      <button
        type="button"
        class="px-3 py-1.5 rounded border text-[11px] transition-colors"
        :class="
          micMonitoringEnabled
            ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
            : 'border-[#4a4a4a] text-gray-300 hover:border-emerald-500/60'
        "
        @click="emit('toggle-monitoring')"
      >
        Odsłuch {{ micMonitoringEnabled ? 'ON' : 'OFF' }}
      </button>
    </div>

    <div class="mt-3 border border-[#2f2f2f] rounded-md bg-[#0f0f0f] p-3">
      <p class="text-xs text-gray-300 mb-2">Presety Głosowe</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="preset in voicePresets"
          :key="preset.id"
          type="button"
          class="px-3 py-1.5 rounded-full border text-[11px] transition-colors"
          :class="
            activeVoicePreset === preset.id
              ? 'bg-blue-600 border-blue-400 text-white'
              : 'bg-[#111] border-[#3a3a3a] text-gray-400 hover:border-gray-500'
          "
          @click="emit('select-voice-preset', preset.id)"
        >
          {{ preset.label }}
        </button>
      </div>
    </div>

    <slot name="input-threshold" />
  </div>
</template>
