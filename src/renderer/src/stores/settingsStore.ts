import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppLanguage } from '../../../shared/schemas/langSchemas'
import { LanguageService } from '@renderer/composables/LanguageService'

// 1. Interfejs dla słownika
export interface LanguageDetails {
  code: AppLanguage
  name: string
  flag: string
}

export const useSettingsStore = defineStore('settings', () => {
  // --- 1. STAN (STATE) ---
  const selectedLanguage = ref<AppLanguage>('pl')
  const isLoadingTranslations = ref(false)
  const sessionPassword = ref<string>('')
  const availableLanguages = ref<AppLanguage[]>(['pl', 'en'])

  // --- SŁOWNIK JĘZYKÓW (Wewnętrzny) ---
  const languagesInfo: Record<AppLanguage, LanguageDetails> = {
    pl: { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    en: { code: 'en', name: 'English', flag: '🇬🇧' }
  }

  // --- SERWIS JĘZYKOWY (Kompozycja) ---
  const languageService = new LanguageService(selectedLanguage, isLoadingTranslations)

  // --- 2. GETTERY (COMPUTED) ---
  const uiLanguages = computed<LanguageDetails[]>(() => {
    return availableLanguages.value.map((code) => languagesInfo[code])
  })

  const currentLanguageDetails = computed<LanguageDetails>(() => {
    return languagesInfo[selectedLanguage.value]
  })

  // --- 3. AKCJE (ACTIONS) ---
  const initLanguage = async (): Promise<void> => {
    await languageService.initLanguage()
  }

  const setLanguage = async (newLang: AppLanguage, forceLoad = false): Promise<void> => {
    await languageService.setLanguage(newLang, forceLoad)
  }

  return {
    selectedLanguage,
    availableLanguages,
    isLoadingTranslations,
    sessionPassword,
    initLanguage,
    setLanguage,
    uiLanguages,
    currentLanguageDetails
  }
})
