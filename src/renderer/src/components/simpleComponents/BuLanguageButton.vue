<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ChevronDown, Loader2 } from 'lucide-vue-next'
import gsap from 'gsap'
import { useI18n } from 'vue-i18n'

import { useSettingsStore, type AppLanguage } from '@renderer/stores/settingsStore'

const store = useSettingsStore()
const { t } = useI18n()
const isOpen = ref<boolean>(false)

// Kierunek otwierania menu
const menuAlignment = ref<'left' | 'right'>('left')

// Referencje DOM (GSAP)
const dropdownRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const itemsRef = ref<HTMLElement[]>([])
const chevronRef = ref<HTMLElement | null>(null)
const textRef = ref<HTMLElement | null>(null)

onMounted((): void => {
  const handleClickOutside = (event: MouseEvent): void => {
    if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
      isOpen.value = false
    }
  }
  document.addEventListener('mousedown', handleClickOutside)
})

// Animacje GSAP i automatyczne wykrywanie krawędzi ekranu
watch(isOpen, (opened): void => {
  if (opened) {
    // SPRAWDZANIE KRAWĘDZI: Czy menu zmieści się po prawej stronie?
    if (dropdownRef.value) {
      const rect = dropdownRef.value.getBoundingClientRect()
      const menuWidth = 224 // szerokość 'w-56' to 224px

      if (rect.left + menuWidth > window.innerWidth) {
        menuAlignment.value = 'right'
      } else {
        menuAlignment.value = 'left'
      }
    }

    if (menuRef.value)
      gsap.to(menuRef.value, {
        display: 'block',
        opacity: 1,
        y: 0,
        duration: 0.3,
        ease: 'back.out(1.7)'
      })
    if (itemsRef.value.length > 0)
      gsap.fromTo(
        itemsRef.value,
        { opacity: 0, x: -15 },
        { opacity: 1, x: 0, stagger: 0.05, duration: 0.3, delay: 0.1, ease: 'sine.inOut' }
      )
    if (chevronRef.value) gsap.to(chevronRef.value, { rotation: 180, duration: 0.3 })
    if (textRef.value)
      gsap.to(textRef.value, { width: 'auto', opacity: 1, marginLeft: '8px', duration: 0.3 })
  } else {
    // Zamykanie
    if (menuRef.value)
      gsap.to(menuRef.value, {
        opacity: 0,
        y: -10,
        duration: 0.2,
        onComplete: (): void => {
          if (menuRef.value) menuRef.value.style.display = 'none'
        }
      })
    if (chevronRef.value) gsap.to(chevronRef.value, { rotation: 0, duration: 0.3 })
    if (textRef.value)
      gsap.to(textRef.value, { width: 0, opacity: 0, marginLeft: 0, duration: 0.2 })
  }
})

const selectLang = async (langCode: AppLanguage): Promise<void> => {
  isOpen.value = false
  await store.setLanguage(langCode)
}
</script>

<template>
  <div ref="dropdownRef" class="relative inline-block text-left select-none">
    <button
      class="flex items-center px-4 py-2.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
      :class="{
        'opacity-70 cursor-wait': store.isLoadingTranslations,
        'hover:bg-black/5': !isOpen && !store.isLoadingTranslations, // Zmienić na 'hover:bg-white/10' jeśli strona ma ciemne tło
        'shadow-md': isOpen // Cień pojawia się tylko, gdy menu jest otwarte
      }"
      :disabled="store.isLoadingTranslations"
      :style="{ backgroundColor: isOpen ? '#481566' : 'transparent' }"
      @click="isOpen = !isOpen"
    >
      <span class="flex items-center justify-center min-w-6">
        <Loader2 v-if="store.isLoadingTranslations" class="animate-spin text-white" :size="20" />
        <span v-else-if="store.currentLanguageDetails.flag" class="text-xl">
          {{ store.currentLanguageDetails.flag }}
        </span>
        <span v-else class="text-sm font-bold text-white tracking-wide uppercase">
          {{ store.currentLanguageDetails.code }}
        </span>
      </span>

      <div ref="textRef" class="overflow-hidden whitespace-nowrap opacity-0 w-0">
        <span class="font-semibold text-white flex items-center gap-2">
          <template v-if="store.isLoadingTranslations">
            <Loader2 class="animate-spin" :size="16" />
          </template>
          <template v-else>
            {{ t(`languageSwitcher.${store.currentLanguageDetails.code}`) }}
          </template>
        </span>
      </div>

      <div ref="chevronRef" class="ml-2 text-white">
        <ChevronDown :size="18" :stroke-width="2.5" />
      </div>
    </button>

    <div
      ref="menuRef"
      style="display: none; opacity: 0; background-color: #481566; border-color: #64238c"
      :class="[
        'absolute mt-3 w-56 border rounded-2xl shadow-xl overflow-hidden z-50',
        menuAlignment === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
      ]"
    >
      <div class="p-1.5">
        <p class="px-3 pt-2 pb-1 text-[10px] font-bold text-[#b580d1] uppercase tracking-widest">
          {{ $t('languageSwitcher.choice') }}
        </p>

        <button
          v-for="lang in store.uiLanguages"
          :key="lang.code"
          ref="itemsRef"
          :class="[
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group',
            store.selectedLanguage === lang.code
              ? 'bg-[#64238c] text-white font-semibold'
              : 'text-gray-200 hover:bg-[#5a1b80] hover:text-white'
          ]"
          @click.stop="selectLang(lang.code)"
        >
          <span class="flex items-center justify-center min-w-6">
            <span v-if="lang.flag" class="text-xl">{{ lang.flag }}</span>
            <span
              v-else
              class="text-sm font-bold tracking-wide uppercase transition-colors"
              :class="
                store.selectedLanguage === lang.code
                  ? 'text-white'
                  : 'text-[#b580d1] group-hover:text-white'
              "
            >
              {{ lang.code }}
            </span>
          </span>

          <span class="font-medium grow">{{ $t(`languageSwitcher.${lang.code}`) }}</span>

          <div
            v-if="store.selectedLanguage === lang.code"
            class="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-sm"
          ></div>
        </button>
      </div>
    </div>
  </div>
</template>
