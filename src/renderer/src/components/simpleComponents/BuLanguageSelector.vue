<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@renderer/stores/settingsStore' // Dostosuj ścieżkę
import BuLanguageFlag from './BuFlagIcon.vue'
import gsap from 'gsap'
import type { AppLanguage } from '@shared/schemas/langSchemas'

const props = withDefaults(
  defineProps<{
    size?: number
  }>(),
  {
    size: 32
  }
)

const { t } = useI18n()
const store = useSettingsStore()

// --- STATE ---
const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const mainFlagRef = ref<InstanceType<typeof BuLanguageFlag> | null>(null)

// --- MAPPING ---
const languageNames = computed<Record<string, string>>(() => ({
  pl: t('languageSwitchButton.languages.pl'),
  en: t('languageSwitchButton.languages.en'),
  er: t('languageSwitchButton.languages.er'),
  plX67: t('languageSwitchButton.languages.plX67'),
  de: t('languageSwitchButton.languages.de'),
  it: t('languageSwitchButton.languages.it'),
  fr: t('languageSwitchButton.languages.fr'),
  es: t('languageSwitchButton.languages.es'),
  cn: t('languageSwitchButton.languages.cn'),
  jp: t('languageSwitchButton.languages.jp'),
  kr: t('languageSwitchButton.languages.kr'),
  id: t('languageSwitchButton.languages.id'),
  sa: t('languageSwitchButton.languages.sa'),
  bd: t('languageSwitchButton.languages.bd'),
  br: t('languageSwitchButton.languages.br'),
  us: t('languageSwitchButton.languages.us')
}))

const currentLangName = computed(
  () => languageNames.value[store.selectedLanguage] || store.selectedLanguage
)
const otherLanguages = computed(() =>
  store.availableLanguages.filter((lang) => lang !== store.selectedLanguage)
)

// --- LOGIC ---
const toggleMenu = (): void => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    animateOpen()
    mainFlagRef.value?.startWaving()
  } else {
    animateClose()
    mainFlagRef.value?.stopWaving()
  }
}

const selectLanguage = async (lang: AppLanguage): Promise<void> => {
  if (lang === store.selectedLanguage) return
  await store.setAppLanguage(lang)
  toggleMenu()
}

// Zamknięcie po kliknięciu poza komponentem
const handleClickOutside = (event: MouseEvent): void => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    if (isOpen.value) toggleMenu()
  }
}

onMounted(() => window.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => window.removeEventListener('click', handleClickOutside))

// --- ANIMATIONS ---
const animateOpen = (): void => {
  if (!containerRef.value || !menuRef.value) return

  // 1. Szerokość i kolor tła
  gsap.to(containerRef.value, {
    width: 220,
    duration: 0.4,
    ease: 'power2.out'
  })

  // 2. Rozwinięcie menu w dół
  gsap.fromTo(
    menuRef.value,
    { height: 0, opacity: 0 },
    { height: 'auto', opacity: 1, duration: 0.4, ease: 'power2.out' }
  )
}

const animateClose = (): void => {
  if (!containerRef.value || !menuRef.value) return

  gsap.to(containerRef.value, {
    width: props.size + 45, // Flaga + strzałka + padding
    backgroundColor: 'transparent',
    duration: 0.3,
    ease: 'power2.in'
  })

  gsap.to(menuRef.value, {
    height: 0,
    opacity: 0,
    duration: 0.2,
    ease: 'power2.in'
  })
}
</script>

<template>
  <div ref="containerRef" class="bu-language-select" :class="{ 'is-open': isOpen }">
    <div class="selected-lang-bar" @click="toggleMenu">
      <BuLanguageFlag ref="mainFlagRef" :country-code="store.selectedLanguage" :size="props.size" />

      <Transition name="fade">
        <span v-if="isOpen" class="current-label">{{ currentLangName }}</span>
      </Transition>

      <div class="arrow-wrapper" :class="{ active: isOpen }">
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
          <path
            d="M1 1.5L6 6.5L11 1.5"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>

    <div ref="menuRef" class="dropdown-menu">
      <div
        v-for="lang in otherLanguages"
        :key="lang"
        class="lang-option"
        @click="selectLanguage(lang)"
      >
        <BuLanguageFlag :country-code="lang" :size="props.size - 4" />
        <span class="option-label">{{ languageNames[lang] || lang }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bu-language-select {
  position: relative;
  width: 77px; /* Rozmiar bazowy (size 32 + strzałka + padding) */
  border-radius: 10px;
  overflow: hidden;
  background-color: transparent;
  cursor: pointer;
  user-select: none;
  z-index: 50;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.selected-lang-bar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 12px;
  height: 48px;
  color: #fff;
}

.current-label {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
}

.arrow-wrapper {
  margin-left: auto;
  display: flex;
  align-items: center;
  transition: transform 0.4s ease;
  color: rgba(255, 255, 255, 0.6);
}

.arrow-wrapper.active {
  transform: rotate(180deg);
  color: #fff;
}

.dropdown-menu {
  opacity: 0;
  height: 0;
  display: flex;
  flex-direction: column;
  padding-bottom: 6px;
}

.lang-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  transition: background 0.2s ease;
}

.lang-option:hover {
  background: rgba(255, 255, 255, 0.1);
}

.option-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  white-space: nowrap;
}

/* Animacja tekstu przy rozszerzaniu */
.fade-enter-active {
  transition: opacity 0.3s ease 0.1s;
}
.fade-leave-active {
  transition: opacity 0.1s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
