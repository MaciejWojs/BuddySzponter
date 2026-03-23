import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AppLanguage, Translation } from '../../../shared/schemas/langSchemas'
import { LanguageService } from '@renderer/composables/LanguageService'

export interface LanguageDetails {
  code: AppLanguage
  name: string
  flag: string
}

export const useSettingsStore = defineStore('settings', () => {
  // --- 1. STATE  ---
  const selectedLanguage = ref<AppLanguage>('er')
  const availableLanguages = ref<AppLanguage[]>([])
  const isLoadingTranslations = ref<boolean>(true)
  const translations = ref<Translation | null>(null)

  const langService = new LanguageService(
    selectedLanguage,
    isLoadingTranslations,
    availableLanguages,
    translations
  )

  // --- ACTIONS ---

  const initSettings = async (): Promise<void> => {
    await langService.init()
  }

  const setAppLanguage = async (lang: AppLanguage): Promise<void> => {
    await langService.changeLanguage(lang)
  }

  // --- RETURN ---
  return {
    // Stan
    selectedLanguage,
    availableLanguages,
    isLoadingTranslations,
    translations,

    initSettings,
    setAppLanguage
  }
})
