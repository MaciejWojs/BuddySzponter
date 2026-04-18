<script setup lang="ts">
defineProps<{
  clipIndicator: boolean
  dbColorClass: string
  dbText: string
  currentPercent: number
  peakPercent: number
  isAutoGate: boolean
  adaptiveThresholdDb: number | null
  inputThresholdPercent: number
  adaptiveThresholdPercent: number
  limiterThresholdPercent: number
  inputThresholdDb: number
  limiterThresholdDb: number
}>()
</script>

<template>
  <section class="w-full rounded-lg border border-[#333] bg-[#1a1a1a] p-3">
    <div class="mb-2 flex items-center justify-between">
      <span
        class="h-2.5 w-2.5 rounded-full border border-[#500] transition-all duration-75"
        :class="clipIndicator ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-[#2a1111]'"
        title="Clip"
      ></span>
      <div class="text-right text-xs font-mono" :class="dbColorClass">{{ dbText }}</div>
    </div>

    <div
      class="relative h-4 w-full overflow-hidden rounded-sm border border-[#3a3a3a] bg-[#0f0f0f]"
    >
      <div
        class="absolute bottom-0 left-0 h-full"
        :style="{ width: `${currentPercent}%`, transition: 'width 40ms linear' }"
      >
        <div class="h-full w-full bg-linear-to-r from-emerald-500 via-amber-400 to-red-500"></div>
      </div>

      <div
        class="absolute top-0 h-full w-[2px] bg-white"
        :style="{ left: `${peakPercent}%` }"
      ></div>

      <div
        v-if="!isAutoGate"
        class="absolute top-0 h-full w-[2px] bg-cyan-400/90"
        :style="{ left: `${inputThresholdPercent}%` }"
        title="Próg wejścia (Gate)"
      ></div>

      <div
        v-if="isAutoGate && adaptiveThresholdDb !== null"
        class="absolute top-0 h-full w-[2px] bg-emerald-300/90"
        :style="{ left: `${adaptiveThresholdPercent}%` }"
        title="Adaptacyjny próg Gate"
      ></div>

      <div
        class="absolute top-0 h-full w-[2px] bg-amber-300/90"
        :style="{ left: `${limiterThresholdPercent}%` }"
        title="Próg limitera"
      ></div>
    </div>

    <div class="mt-1 flex items-center justify-between text-[10px] text-gray-500">
      <span class="inline-flex items-center gap-1">
        <span
          class="h-2 w-2 rounded-full"
          :class="isAutoGate ? 'bg-emerald-300' : 'bg-cyan-400'"
        ></span>
        Gate
        {{
          isAutoGate && adaptiveThresholdDb !== null
            ? `AUTO ${adaptiveThresholdDb.toFixed(1)} dB`
            : `${inputThresholdDb.toFixed(1)} dB`
        }}
      </span>
      <span class="inline-flex items-center gap-1">
        <span class="h-2 w-2 rounded-full bg-amber-300"></span>
        Limiter {{ limiterThresholdDb.toFixed(1) }} dB
      </span>
    </div>

    <div class="mt-1 flex items-center justify-between text-[10px] text-gray-500">
      <span>-60</span>
      <span>-48</span>
      <span>-36</span>
      <span>-24</span>
      <span>-12</span>
      <span>0</span>
    </div>

    <div class="mt-2 flex items-center justify-between text-[10px] text-gray-500">
      <span>RMS</span>
      <span>Peak</span>
    </div>
  </section>
</template>
