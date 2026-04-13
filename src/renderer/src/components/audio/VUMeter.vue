<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  analyser?: AnalyserNode | null
}>()

const currentDb = ref<number>(-60)
const peakDb = ref<number>(-60)
const clipIndicator = ref<boolean>(false)

let rafId: number | null = null
let dataArray: Float32Array<ArrayBuffer> | null = null

const clampDb = (value: number): number => {
  if (!Number.isFinite(value)) return -60
  return Math.max(-60, Math.min(0, value))
}

const toPercent = (db: number): number => {
  return ((clampDb(db) + 60) / 60) * 100
}

const currentPercent = computed<number>(() => toPercent(currentDb.value))
const peakPercent = computed<number>(() => toPercent(peakDb.value))

const dbText = computed<string>(() => `${currentDb.value.toFixed(1)} dB`)

const dbColorClass = computed<string>(() => {
  if (currentDb.value > -6) return 'text-red-400'
  if (currentDb.value > -18) return 'text-amber-400'
  return 'text-emerald-400'
})

const stopAnimationLoop = (): void => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

const resetMeterState = (): void => {
  currentDb.value = -60
  peakDb.value = -60
  clipIndicator.value = false
}

const stopMeter = (): void => {
  stopAnimationLoop()
  resetMeterState()
}

const tick = (): void => {
  const analyser = props.analyser
  if (!analyser || !dataArray) {
    stopAnimationLoop()
    resetMeterState()
    return
  }

  analyser.getFloatTimeDomainData(dataArray)

  let sumSquares = 0
  for (let i = 0; i < dataArray.length; i += 1) {
    const sample = dataArray[i]
    sumSquares += sample * sample
  }

  const rms = Math.sqrt(sumSquares / dataArray.length)
  const db = Math.max(-60, 20 * Math.log10(Math.max(rms, 1e-8)))
  const limitedDb = clampDb(db)

  currentDb.value = limitedDb
  clipIndicator.value = limitedDb > -0.5

  if (limitedDb >= peakDb.value) {
    peakDb.value = limitedDb
  } else {
    peakDb.value = Math.max(-60, peakDb.value - 0.5)
  }

  rafId = requestAnimationFrame(tick)
}

const startMeter = (): void => {
  const analyser = props.analyser
  if (!analyser) {
    stopMeter()
    return
  }

  dataArray = new Float32Array(analyser.fftSize) as Float32Array<ArrayBuffer>

  stopAnimationLoop()
  rafId = requestAnimationFrame(tick)
}

watch(
  () => props.analyser,
  (analyser) => {
    if (!analyser) {
      stopMeter()
      dataArray = null
      return
    }

    dataArray = new Float32Array(analyser.fftSize) as Float32Array<ArrayBuffer>
    startMeter()
  }
)

onMounted(() => {
  startMeter()
})

onUnmounted(() => {
  stopMeter()
  dataArray = null
})
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
