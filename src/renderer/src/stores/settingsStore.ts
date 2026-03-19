import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppLanguage } from '../../../shared/schemas/langSchemas'
import { LanguageService } from '@renderer/composables/LanguageService'

export interface LanguageDetails {
  code: AppLanguage
  name: string
  flag: string
}

export const useSettingsStore = defineStore('settings', () => {
  // --- STATE ---
  const selectedLanguage = ref<AppLanguage>('en')
  const isLoadingTranslations = ref(false)
  const sessionPassword = ref<string>('')
  const availableLanguages = ref<AppLanguage[]>(['pl', 'en', 'plX67'])

  // --- LANGUAGES ---
  const languagesInfo: Record<AppLanguage, LanguageDetails> = {
    pl: { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    en: { code: 'en', name: 'English', flag: '🇬🇧' },
    plX67: { code: 'plX67', name: 'Szponterski', flag: '🏴‍☠️' }
  }

  const languageService = new LanguageService(selectedLanguage, isLoadingTranslations)

  const uiLanguages = computed<LanguageDetails[]>(() => {
    return availableLanguages.value.map((code) => languagesInfo[code])
  })

  const currentLanguageDetails = computed<LanguageDetails>(() => {
    return languagesInfo[selectedLanguage.value]
  })

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
