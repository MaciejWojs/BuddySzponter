// composables/LanguageService.ts
import { ref } from 'vue'
// Pamiętaj o zaimportowaniu swojej instancji i18n oraz typu AppLanguage
import i18n from '../i18n' // Zmień na właściwą ścieżkę do Twojego pliku i18n
import type { AppLanguage } from 'src/shared/schemas/langSchemas' // Zmień na właściwą ścieżkę

export class LanguageService {
  constructor(
    private selectedLanguageRef: ReturnType<typeof ref<AppLanguage>>,
    private isLoadingTranslationsRef: ReturnType<typeof ref<boolean>>
  ) {}

  async initLanguage(): Promise<void> {
    try {
      // @ts-ignore - upewnij się, że window.api ma odpowiednie typy w global.d.ts
      const savedLang = await window.api.settings.getLanguage()
      await this.setLanguage(savedLang, true)
    } catch (error) {
      console.error('Błąd podczas inicjalizacji języka z Electrona:', error)
    }
  }

  async setLanguage(newLang: AppLanguage, forceLoad = false): Promise<void> {
    if (!forceLoad && this.selectedLanguageRef.value === newLang) return

    this.isLoadingTranslationsRef.value = true
    try {
      const response = await window.api.settings.setLanguage(newLang)

      if (response.success && response.data) {
        i18n.global.setLocaleMessage(newLang, response.data)
        i18n.global.locale.value = newLang

        this.selectedLanguageRef.value = newLang
      } else {
        console.error('Nie można załadować tłumaczeń z API/Cache:', response.error)
      }
    } catch (e) {
      console.error('Błąd podczas zmiany języka:', e)
    } finally {
      this.isLoadingTranslationsRef.value = false
    }
  }
}
