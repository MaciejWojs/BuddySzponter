import { defineStore } from 'pinia'
import { ref, type Ref } from 'vue'
import type { AppLanguage, Translation } from '../../../shared/schemas/langSchemas'
import { LanguageService } from '@renderer/composables/languageService'
import type { AppVersion } from '@renderer/schemas/settingsSchemas'
import { VersionsService } from '@renderer/composables/versionsService'
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
  const supportedVersions = ref<AppVersion[]>([])

  const langService = new LanguageService(
    selectedLanguage,
    isLoadingTranslations,
    availableLanguages,
    translations
  )

  // --- SERVICES ---

  const versionsService = new VersionsService(supportedVersions as Ref<AppVersion[]>)

  // --- ACTIONS ---

  const initSettings = async (): Promise<void> => {
    await langService.init()
    await versionsService.init()
  }

  const setAppLanguage = async (lang: AppLanguage): Promise<void> => {
    await langService.changeLanguage(lang)
  }

  const fetchSupportedVersions = versionsService.fetchSupportedVersions.bind(versionsService)

  const getCurrentVersion = versionsService.getVersion.bind(versionsService)

  // --- RETURN ---
  return {
    selectedLanguage,
    availableLanguages,
    isLoadingTranslations,
    translations,
    supportedVersions,
    fetchSupportedVersions,
    initSettings,
    setAppLanguage,
    getCurrentVersion
  }
})
