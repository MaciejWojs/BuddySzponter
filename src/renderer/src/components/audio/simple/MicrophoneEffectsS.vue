<script setup lang="ts">
import { onMounted, ref } from 'vue'
import gsap from 'gsap'

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

const panelRef = ref<HTMLDivElement | null>(null)
const controlsRef = ref<HTMLDivElement | null>(null)
const presetsRef = ref<HTMLDivElement | null>(null)

const handleButtonEnter = (event: MouseEvent): void => {
  const button = event.currentTarget as HTMLButtonElement | null
  if (!button) return

  gsap.to(button, {
    duration: 0.2,
    y: -1,
    scale: 1.02,
    boxShadow: '0 8px 18px rgba(72, 21, 102, 0.28)',
    ease: 'power2.out'
  })
}

const handleButtonLeave = (event: MouseEvent): void => {
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

const handleToggleLimiter = (event: MouseEvent): void => {
  animateButtonClick(event)
  emit('toggle-limiter')
}

const handleToggleBassBoost = (event: MouseEvent): void => {
  animateButtonClick(event)
  emit('toggle-bass-boost')
}

const handleToggleStudioMode = (event: MouseEvent): void => {
  animateButtonClick(event)
  emit('toggle-studio-mode')
}

const handleToggleMonitoring = (event: MouseEvent): void => {
  animateButtonClick(event)
  emit('toggle-monitoring')
}

const handleSelectVoicePreset = (presetId: string, event: MouseEvent): void => {
  animateButtonClick(event)
  emit('select-voice-preset', presetId)
}

onMounted(() => {
  if (panelRef.value) {
    gsap.from(panelRef.value, {
      duration: 0.46,
      opacity: 0,
      y: 12,
      ease: 'power2.out'
    })
  }

  if (controlsRef.value) {
    const buttons = controlsRef.value.querySelectorAll('button')
    gsap.from(buttons, {
      duration: 0.32,
      opacity: 0,
      y: 8,
      stagger: 0.04,
      ease: 'power2.out'
    })
  }

  if (presetsRef.value) {
    const buttons = presetsRef.value.querySelectorAll('button')
    gsap.from(buttons, {
      duration: 0.32,
      opacity: 0,
      y: 8,
      stagger: 0.03,
      delay: 0.06,
      ease: 'power2.out'
    })
  }
})
</script>

<template>
  <div
    ref="panelRef"
    class="rounded-md border border-[#2d0f44] bg-[#06001f] p-3 shadow-[0_10px_26px_rgba(3,0,18,0.45)]"
  >
    <p class="mb-3 text-xs text-violet-200/85">Efekty mikrofonu</p>

    <div ref="controlsRef" class="mb-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="rounded border px-3 py-1.5 text-[11px] transition-colors"
        :class="
          micLimiterEnabled
            ? 'border-amber-500 bg-amber-500/15 text-amber-200'
            : 'border-[#3a1760] bg-[#0d0426] text-violet-200/80 hover:border-amber-500/70'
        "
        @mouseenter="handleButtonEnter"
        @mouseleave="handleButtonLeave"
        @click="handleToggleLimiter"
      >
        Limiter {{ micLimiterEnabled ? 'ON' : 'OFF' }}
      </button>

      <button
        type="button"
        class="rounded border px-3 py-1.5 text-[11px] transition-colors"
        :class="
          micBassBoostEnabled
            ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200'
            : 'border-[#3a1760] bg-[#0d0426] text-violet-200/80 hover:border-indigo-500/70'
        "
        @mouseenter="handleButtonEnter"
        @mouseleave="handleButtonLeave"
        @click="handleToggleBassBoost"
      >
        Radiowy Bas {{ micBassBoostEnabled ? 'ON' : 'OFF' }}
      </button>

      <button
        type="button"
        class="group relative rounded border px-3 py-1.5 text-[11px] transition-colors"
        :class="
          micStudioModeEnabled
            ? 'border-fuchsia-500 bg-fuchsia-500/15 text-fuchsia-200'
            : 'border-[#3a1760] bg-[#0d0426] text-violet-200/80 hover:border-fuchsia-500/70'
        "
        @mouseenter="handleButtonEnter"
        @mouseleave="handleButtonLeave"
        @click="handleToggleStudioMode"
      >
        Tryb Studio {{ micStudioModeEnabled ? 'ON' : 'OFF' }}
        <div
          class="absolute bottom-full left-1/2 z-10 mb-2 hidden w-48 -translate-x-1/2 rounded border border-[#5a2480] bg-[#0a0221] p-2 text-center text-[10px] text-violet-200 shadow-lg shadow-violet-900/25 whitespace-normal group-hover:block"
        >
          Wylacza obrobke przegladarki dla maksymalnej jakosci. Uzywaj tylko w sluchawkach!
        </div>
      </button>

      <button
        type="button"
        class="rounded border px-3 py-1.5 text-[11px] transition-colors"
        :class="
          micMonitoringEnabled
            ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
            : 'border-[#3a1760] bg-[#0d0426] text-violet-200/80 hover:border-emerald-500/70'
        "
        @mouseenter="handleButtonEnter"
        @mouseleave="handleButtonLeave"
        @click="handleToggleMonitoring"
      >
        Odsłuch {{ micMonitoringEnabled ? 'ON' : 'OFF' }}
      </button>
    </div>

    <div class="mt-3 rounded-md border border-[#2d0f44] bg-[#090223] p-3">
      <p class="mb-2 text-xs text-violet-200/85">Presety Głosowe</p>
      <div ref="presetsRef" class="flex flex-wrap gap-2">
        <button
          v-for="preset in voicePresets"
          :key="preset.id"
          type="button"
          class="rounded-full border px-3 py-1.5 text-[11px] transition-colors"
          :class="
            activeVoicePreset === preset.id
              ? 'border-[#8b5cf6] bg-[#481566] text-violet-100 shadow-[0_0_12px_rgba(139,92,246,0.35)]'
              : 'border-[#3a1760] bg-[#0d0426] text-violet-200/75 hover:border-[#6c2a92]'
          "
          @mouseenter="handleButtonEnter"
          @mouseleave="handleButtonLeave"
          @click="handleSelectVoicePreset(preset.id, $event)"
        >
          {{ preset.label }}
        </button>
      </div>
    </div>

    <div class="mt-3">
      <slot name="input-threshold" />
    </div>
  </div>
</template>
