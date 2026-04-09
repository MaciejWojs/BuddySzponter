import { defineStore } from 'pinia'
import { computed, ref, type Ref } from 'vue'
import type { AppLanguage, Translation } from '../../../shared/schemas/langSchemas'
import { LanguageService } from '@renderer/composables/settings/languageService'
import type { AppVersion } from '@renderer/schemas/settingsSchemas'
import { VersionStatus, VersionsService } from '@renderer/composables/settings/versionsService'
export interface LanguageDetails {
  code: AppLanguage
  name: string
  flag: string
}

export const useSettingsStore = defineStore('settings', () => {
  // --- 1. STATE  ---
  const selectedLanguage = ref<AppLanguage>('en')
  const availableLanguages = ref<AppLanguage[]>([])
  const isLoadingTranslations = ref<boolean>(true)
  const translations = ref<Translation | null>(null)
  const supportedVersions = ref<AppVersion[]>([])
  const versionStatus = ref<VersionStatus>('UNKNOWN')
  const isUpdateRequired = computed(() => versionStatus.value === 'UPDATE_REQUIRED')

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
    await Promise.all([langService.init(), versionsService.init(), refreshVersionStatus()])
  }

  const setAppLanguage = async (lang: AppLanguage): Promise<void> => {
    await langService.changeLanguage(lang)
  }

  const fetchSupportedVersions = versionsService.fetchSupportedVersions.bind(versionsService)

  const getCurrentVersion = versionsService.getVersion.bind(versionsService)

  const checkVersionStatus = versionsService.checkVersionStatus.bind(versionsService)
  const refreshVersionStatus = async (): Promise<VersionStatus> => {
    const status = await checkVersionStatus()
    versionStatus.value = status
    return status
  }

  // --- RETURN ---
  return {
    selectedLanguage,
    availableLanguages,
    isLoadingTranslations,
    translations,
    supportedVersions,
    versionStatus,
    isUpdateRequired,
    fetchSupportedVersions,
    initSettings,
    setAppLanguage,
    getCurrentVersion,
    checkVersionStatus: refreshVersionStatus
  }
})
