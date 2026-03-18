<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ChevronDown, Loader2 } from 'lucide-vue-next'
import gsap from 'gsap'
import { useI18n } from 'vue-i18n' // Dodany import uzycia i18n

// Zaimportuj store i typ z pliku store'a
import { useSettingsStore, type AppLanguage } from '@renderer/stores/settingsStore'

const store = useSettingsStore()
const { t } = useI18n() // Inicjalizacja i18n
const isOpen = ref<boolean>(false)

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

// Animacje GSAP
watch(isOpen, (opened): void => {
  if (opened) {
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
        { opacity: 1, x: 0, stagger: 0.05, duration: 0.3, delay: 0.1, ease: 'power2.out' }
      )
    if (chevronRef.value) gsap.to(chevronRef.value, { rotation: 180, duration: 0.3 })
    if (textRef.value)
      gsap.to(textRef.value, { width: 'auto', opacity: 1, marginLeft: '8px', duration: 0.3 })
  } else {
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

// Akcja zmiany języka
const selectLang = async (langCode: AppLanguage): Promise<void> => {
  isOpen.value = false
  await store.setLanguage(langCode)
}
</script>

<template>
  <div ref="dropdownRef" class="relative inline-block text-left">
    <button
      class="flex items-center px-4 py-2.5 rounded-full shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      :class="{
        'opacity-70 cursor-wait': store.isLoadingTranslations,
        'hover:shadow-md': !store.isLoadingTranslations
      }"
      :disabled="store.isLoadingTranslations"
      style="background-color: #481566"
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
        <span class="font-semibold text-white">
          {{
            store.isLoadingTranslations
              ? t('LanguageSwitcher.loading')
              : t(`LanguageSwitcher.${store.currentLanguageDetails.code}`)
          }}
        </span>
      </div>

      <div ref="chevronRef" class="ml-2 text-white">
        <ChevronDown :size="18" :stroke-width="2.5" />
      </div>
    </button>

    <div
      ref="menuRef"
      style="display: none; opacity: 0"
      class="absolute left-0 mt-3 w-56 origin-top-left bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden"
    >
      <div class="p-1.5">
        <p class="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {{ $t('LanguageSwitcher.choice') }}
        </p>

        <button
          v-for="lang in store.uiLanguages"
          :key="lang.code"
          ref="itemsRef"
          :class="[
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group',
            store.selectedLanguage === lang.code
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-50'
          ]"
          @click="selectLang(lang.code)"
        >
          <span class="flex items-center justify-center min-w-6">
            <span v-if="lang.flag" class="text-xl">{{ lang.flag }}</span>
            <span
              v-else
              class="text-sm font-bold tracking-wide uppercase transition-colors"
              :class="
                store.selectedLanguage === lang.code
                  ? 'text-blue-600'
                  : 'text-gray-500 group-hover:text-gray-700'
              "
            >
              {{ lang.code }}
            </span>
          </span>

          <span class="font-medium grow">{{ $t(`LanguageSwitcher.${lang.code}`) }}</span>

          <div
            v-if="store.selectedLanguage === lang.code"
            class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"
          ></div>
        </button>
      </div>
    </div>
  </div>
</template>
