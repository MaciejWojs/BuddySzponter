<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { microphoneService } from '@renderer/services/micService'

const props = defineProps<{
  analyser?: AnalyserNode | null
  contextMode?: 'manual' | 'auto-mic'
  enabled?: boolean
  isCapturing?: boolean
  deviceId?: string
  volume?: number
  inputThresholdLinear?: number
  limiterThresholdDb?: number
}>()

const currentDb = ref<number>(-60)
const peakDb = ref<number>(-60)
const clipIndicator = ref<boolean>(false)
const adaptiveThresholdDb = ref<number | null>(null)
const RMS_SMOOTHING = 0.85

let rafId: number | null = null
let dataArray: Float32Array<ArrayBuffer> | null = null
let smoothedRms = 0

const getEffectiveAnalyser = (): AnalyserNode | null => {
  if (props.contextMode === 'auto-mic') {
    return microphoneService.getAnalyserNode()
  }

  return props.analyser ?? null
}

const syncAutoMicContext = async (): Promise<void> => {
  if (props.contextMode !== 'auto-mic') {
    return
  }

  const isEnabled = props.enabled ?? true
  const isCapturing = props.isCapturing ?? false
  const volume = props.volume ?? 1

  if (!isEnabled) {
    if (!isCapturing) {
      microphoneService.stop()
    }
    return
  }

  if (!isCapturing) {
    await microphoneService.start(props.deviceId || undefined, volume)
  }
}

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

const inputThresholdDb = computed<number>(() => {
  if (typeof props.inputThresholdLinear === 'number') {
    const linear = Math.max(1e-8, props.inputThresholdLinear)
    return clampDb(20 * Math.log10(linear))
  }

  if (props.contextMode === 'auto-mic') {
    const linear = Math.max(1e-8, microphoneService.getInputThreshold())
    return clampDb(20 * Math.log10(linear))
  }

  return -60
})

const isAutoGate = computed<boolean>(() => {
  return props.contextMode === 'auto-mic' && inputThresholdDb.value <= -59.5
})

const limiterThresholdDb = computed<number>(() => {
  return clampDb(props.limiterThresholdDb ?? -10)
})

const inputThresholdPercent = computed<number>(() => toPercent(inputThresholdDb.value))
const limiterThresholdPercent = computed<number>(() => toPercent(limiterThresholdDb.value))
const adaptiveThresholdPercent = computed<number>(() => toPercent(adaptiveThresholdDb.value ?? -60))

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
  adaptiveThresholdDb.value = null
  smoothedRms = 0
}

const stopMeter = (): void => {
  stopAnimationLoop()
  resetMeterState()
}

const tick = (): void => {
  const analyser = getEffectiveAnalyser()
  if (!analyser) {
    const shouldRetry =
      props.contextMode === 'auto-mic' && (props.enabled ?? true) && (props.isCapturing ?? false)
    if (!shouldRetry) {
      stopAnimationLoop()
    }
    resetMeterState()
    if (shouldRetry) {
      rafId = requestAnimationFrame(tick)
    }
    return
  }

  if (props.contextMode === 'auto-mic') {
    adaptiveThresholdDb.value = clampDb(
      20 * Math.log10(Math.max(1e-8, microphoneService.getCurrentGateThreshold()))
    )
  } else {
    adaptiveThresholdDb.value = null
  }

  if (!dataArray || dataArray.length !== analyser.fftSize) {
    dataArray = new Float32Array(analyser.fftSize) as Float32Array<ArrayBuffer>
  }

  analyser.getFloatTimeDomainData(dataArray)

  let sumSquares = 0
  for (let i = 0; i < dataArray.length; i += 1) {
    const sample = dataArray[i]
    sumSquares += sample * sample
  }

  const currentRms = Math.sqrt(sumSquares / dataArray.length)
  smoothedRms = RMS_SMOOTHING * smoothedRms + (1 - RMS_SMOOTHING) * currentRms

  const db = Math.max(-60, 20 * Math.log10(Math.max(smoothedRms, 1e-8)))
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
  stopAnimationLoop()
  rafId = requestAnimationFrame(tick)
}

watch(
  () => [props.contextMode, props.enabled, props.isCapturing, props.deviceId, props.volume],
  () => {
    void syncAutoMicContext()
    startMeter()
  },
  { immediate: true }
)

onMounted(() => {
  void syncAutoMicContext()
  startMeter()
})

onUnmounted(() => {
  if (props.contextMode === 'auto-mic' && !(props.isCapturing ?? false)) {
    microphoneService.stop()
  }
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

      <div
        class="absolute top-0 h-full w-[2px] bg-cyan-400/90"
        :style="{ left: `${inputThresholdPercent}%` }"
        title="Próg wejścia (Gate)"
      ></div>

      <div
        v-if="adaptiveThresholdDb !== null"
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
        <span class="h-2 w-2 rounded-full bg-cyan-400"></span>
        Gate
        {{
          isAutoGate && adaptiveThresholdDb !== null
            ? `${adaptiveThresholdDb.toFixed(1)} dB`
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
