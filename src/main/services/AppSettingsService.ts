import { randomUUID } from 'crypto'
import os from 'os'
import { localStore } from '../store/localStore'
import { AppLanguage, AppLanguageSchema, Translation } from '../schemas/langSchemas'
import { loadTranslations } from '../handlers/i18n'

export class AppSettingsService {
  private static instance: AppSettingsService

  private constructor() {
    //
  }

  public static getInstance(): AppSettingsService {
    if (!AppSettingsService.instance) {
      AppSettingsService.instance = new AppSettingsService()
    }
    return AppSettingsService.instance
  }

  // --- LANGUAGE MANAGEMENT ---

  public getLanguage(): AppLanguage {
    const lang = localStore.get('language')
    const parsed = AppLanguageSchema.safeParse(lang)
    return parsed.success ? parsed.data : 'pl'
  }

  public async setLanguage(
    lang: unknown
  ): Promise<{ success: boolean; data?: Translation; error?: string }> {
    const parsed = AppLanguageSchema.safeParse(lang)

    if (!parsed.success) {
      console.error('[AppSettingsService] Invalid language code:', lang)
      return { success: false, error: 'Invalid language code' }
    }

    const validLang = parsed.data

    try {
      const result = await loadTranslations(validLang)

      if (result.success) {
        localStore.set('language', validLang)
      }

      return result
    } catch (error) {
      console.error('[AppSettingsService] Fatal error setting language:', error)
      return { success: false, error: 'Internal system error' }
    }
  }

  // --- HARDWARE ID MANAGEMENT ---

  public getHardwareId(): string {
    let hwId = localStore.get('hardwareId')

    if (!hwId) {
      hwId = this.generateHardwareId()
      localStore.set('hardwareId', hwId)
    }

    return hwId
  }

  private generateHardwareId(): string {
    const userInfo = os.userInfo().username
    const hostname = os.hostname()
    const uuid = randomUUID()

    return `${hostname}-${userInfo}-${uuid}`
  }
}

export const appSettings = AppSettingsService.getInstance()
