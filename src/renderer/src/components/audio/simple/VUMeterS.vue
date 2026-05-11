<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import gsap from 'gsap'

const props = defineProps<{
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

const panelRef = ref<HTMLElement | null>(null)
const meterFrameRef = ref<HTMLDivElement | null>(null)
const meterFillRef = ref<HTMLDivElement | null>(null)
const peakRef = ref<HTMLDivElement | null>(null)
const clipRef = ref<HTMLSpanElement | null>(null)

const dbTextClass = computed(() => ['text-violet-200/90', props.dbColorClass])

const animateMeterHoverIn = (): void => {
  if (!meterFrameRef.value) return
  gsap.to(meterFrameRef.value, {
    duration: 0.25,
    borderColor: '#481566',
    boxShadow: '0 0 0 1px rgba(72, 21, 102, 0.8), inset 0 0 14px rgba(72, 21, 102, 0.35)',
    ease: 'power2.out'
  })
}

const animateMeterHoverOut = (): void => {
  if (!meterFrameRef.value) return
  gsap.to(meterFrameRef.value, {
    duration: 0.25,
    borderColor: '#2d0f44',
    boxShadow: '0 0 0 0 rgba(72, 21, 102, 0)',
    ease: 'power2.out'
  })
}

watch(
  () => props.currentPercent,
  (value) => {
    if (!meterFillRef.value) return
    gsap.to(meterFillRef.value, {
      width: `${value}%`,
      duration: 0.08,
      ease: 'none',
      overwrite: true
    })
  },
  { immediate: true }
)

watch(
  () => props.peakPercent,
  (value) => {
    if (!peakRef.value) return
    gsap.to(peakRef.value, {
      left: `${value}%`,
      duration: 0.11,
      ease: 'power2.out',
      overwrite: true
    })
  },
  { immediate: true }
)

watch(
  () => props.clipIndicator,
  (isClipping) => {
    if (!clipRef.value) return

    if (isClipping) {
      gsap.fromTo(
        clipRef.value,
        { scale: 0.85 },
        {
          scale: 1.1,
          duration: 0.12,
          repeat: 3,
          yoyo: true,
          ease: 'power1.inOut'
        }
      )
      return
    }

    gsap.to(clipRef.value, {
      scale: 1,
      duration: 0.16,
      ease: 'power2.out',
      overwrite: true
    })
  }
)

onMounted(() => {
  if (!panelRef.value) return
  gsap.from(panelRef.value, {
    duration: 0.45,
    opacity: 0,
    y: 12,
    ease: 'power2.out'
  })
})
</script>

<template>
  <section
    ref="panelRef"
    class="w-full rounded-lg border border-[#2d0f44] bg-[#06001f] p-3 shadow-[0_8px_26px_rgba(3,0,18,0.55)]"
  >
    <div class="mb-2 flex items-center justify-between">
      <span
        ref="clipRef"
        class="h-2.5 w-2.5 rounded-full border transition-all duration-100"
        :class="
          clipIndicator
            ? 'border-[#9f1239] bg-rose-500 shadow-[0_0_9px_rgba(244,63,94,0.9)]'
            : 'border-[#3d144f] bg-[#22072e]'
        "
        title="Clip"
      ></span>
      <div class="text-right text-xs font-mono font-semibold" :class="dbTextClass">
        {{ dbText }}
      </div>
    </div>

    <div
      ref="meterFrameRef"
      class="relative h-4 w-full overflow-hidden rounded-sm border border-[#2d0f44] bg-[#0a0326]"
      @mouseenter="animateMeterHoverIn"
      @mouseleave="animateMeterHoverOut"
    >
      <div
        ref="meterFillRef"
        class="absolute bottom-0 left-0 h-full"
        :style="{ width: `${currentPercent}%` }"
      >
        <div
          class="h-full w-full bg-linear-to-r from-violet-500 via-fuchsia-400 to-amber-300 shadow-[0_0_14px_rgba(192,132,252,0.45)]"
        ></div>
      </div>

      <div
        ref="peakRef"
        class="absolute top-0 h-full w-0.5 bg-violet-100 shadow-[0_0_8px_rgba(196,181,253,0.9)]"
        :style="{ left: `${peakPercent}%` }"
      ></div>

      <div
        v-if="!props.isAutoGate"
        class="absolute top-0 h-full w-0.5 bg-cyan-300/90 shadow-[0_0_6px_rgba(103,232,249,0.7)]"
        :style="{ left: `${props.inputThresholdPercent}%` }"
        title="Próg wejścia (Gate)"
      ></div>

      <div
        v-if="props.isAutoGate && props.adaptiveThresholdDb !== null"
        class="absolute top-0 h-full w-0.5 bg-emerald-300/90 shadow-[0_0_6px_rgba(110,231,183,0.7)]"
        :style="{ left: `${props.adaptiveThresholdPercent}%` }"
        title="Adaptacyjny próg Gate"
      ></div>

      <div
        class="absolute top-0 h-full w-0.5 bg-amber-300/90 shadow-[0_0_6px_rgba(252,211,77,0.7)]"
        :style="{ left: `${props.limiterThresholdPercent}%` }"
        title="Próg limitera"
      ></div>
    </div>

    <div class="mt-1 flex items-center justify-between text-[10px] text-violet-200/70">
      <span class="inline-flex items-center gap-1">
        <span
          class="h-2 w-2 rounded-full"
          :class="props.isAutoGate ? 'bg-emerald-300' : 'bg-cyan-300'"
        ></span>
        Gate
        {{
          props.isAutoGate && props.adaptiveThresholdDb !== null
            ? `AUTO ${props.adaptiveThresholdDb.toFixed(1)} dB`
            : `${props.inputThresholdDb.toFixed(1)} dB`
        }}
      </span>
      <span class="inline-flex items-center gap-1">
        <span class="h-2 w-2 rounded-full bg-amber-300"></span>
        Limiter {{ props.limiterThresholdDb.toFixed(1) }} dB
      </span>
    </div>

    <div class="mt-1 flex items-center justify-between text-[10px] text-violet-200/45">
      <span>-60</span>
      <span>-48</span>
      <span>-36</span>
      <span>-24</span>
      <span>-12</span>
      <span>0</span>
    </div>

    <div class="mt-2 flex items-center justify-between text-[10px] text-violet-300/70">
      <span>RMS</span>
      <span>Peak</span>
    </div>
  </section>
</template>
