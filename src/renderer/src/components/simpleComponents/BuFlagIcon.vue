<script setup lang="ts">
import { ref, onBeforeUnmount, computed } from 'vue'
import gsap from 'gsap'
import type { AppLanguage } from '@shared/schemas/langSchemas'

const props = withDefaults(
  defineProps<{
    countryCode: AppLanguage
    size?: number
  }>(),
  { size: 32 }
)

const flagRef = ref<HTMLImageElement | null>(null)
const animation = ref<gsap.core.Tween | null>(null)

const languageToFlag: Record<string, string> = {
  bd: 'bd',
  br: 'br',
  cn: 'cn',
  de: 'de',
  es: 'es',
  fr: 'fr',
  en: 'gb',
  id: 'id',
  it: 'it',
  jp: 'jp',
  kr: 'kr',
  pl: 'pl',
  ru: 'ru',
  sa: 'sa',
  us: 'us',
  plX67: 'pl',
  er: 'gb'
}

const flagUrl = computed(() => {
  const code = languageToFlag[props.countryCode] || props.countryCode
  // Zostawiamy Twoją ścieżkę
  return `src/assets/images/flags/${code.toLowerCase()}.svg`
})

const height = computed(() => Math.round(props.size * 0.75))

const startWaving = (): void => {
  if (!flagRef.value) return

  // Jeśli animacja już istnieje, po prostu ją wznów (play)
  if (animation.value) {
    animation.value.play()
  } else {
    // Tworzymy animację - używamy rotateZ i skew dla efektu łopotania
    animation.value = gsap.to(flagRef.value, {
      rotateZ: 10,
      skewY: -5,
      scaleY: 0.9,
      transformOrigin: 'left center',
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      duration: 0.35
    })
  }
}

const stopWaving = (): void => {
  if (animation.value) {
    animation.value.pause()
    // Płynny powrót do bazy
    gsap.to(flagRef.value, {
      rotateZ: 0,
      skewY: 0,
      scaleY: 1,
      duration: 0.4,
      ease: 'power2.out',
      overwrite: true // To jest ważne!
    })
  }
}

onBeforeUnmount(() => {
  animation.value?.kill()
})

defineExpose({ startWaving, stopWaving })
</script>

<template>
  <img
    ref="flagRef"
    :src="flagUrl"
    :alt="`Flag ${countryCode}`"
    class="bu-flag-icon block select-none pointer-events-none"
    :style="{
      width: `${size}px`,
      height: `${height}px`
    }"
  />
</template>

<style scoped>
.bu-flag-icon {
  will-change: transform;
  object-fit: cover;
  border-radius: 2px;
  backface-visibility: hidden;
}
</style>
