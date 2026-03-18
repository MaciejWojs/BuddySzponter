import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
// import { fetchTranslations } from '../api/fetchTranslations'
import i18n from '../i18n'

export type AppLanguage = 'pl' | 'en'

// 1. Nowy interfejs dla słownika
export interface LanguageDetails {
  code: AppLanguage
  name: string
  flag: string
}

export const useSettingsStore = defineStore('settings', () => {
  // --- SŁOWNIK JĘZYKÓW (Wewnętrzny) ---
  const languagesInfo: Record<AppLanguage, LanguageDetails> = {
    pl: { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    en: { code: 'en', name: 'English', flag: '🇬🇧' }
  }

  // --- 1. STAN (STATE) ---
  const selectedLanguage = ref<AppLanguage>(
    (localStorage.getItem('app_lang') as AppLanguage) || 'pl'
  )
  const sessionPassword = ref<string>('')
  const availableLanguages = ref<AppLanguage[]>(['pl', 'en'])
  const isLoadingTranslations = ref(false)

  // --- 2. GETTERY (COMPUTED) ---
  // A: Lista obiektów języków do wygenerowania przycisków w menu (v-for)
  const uiLanguages = computed<LanguageDetails[]>(() => {
    return availableLanguages.value.map((code) => languagesInfo[code])
  })

  // B: Szczegóły aktualnie wybranego języka (do pokazania na głównym przycisku)
  const currentLanguageDetails = computed<LanguageDetails>(() => {
    return languagesInfo[selectedLanguage.value]
  })

  // --- 3. AKCJE (ACTIONS) ---
  async function setLanguage(newLang: AppLanguage): Promise<void> {
    if (selectedLanguage.value === newLang) return
    isLoadingTranslations.value = true
    try {
      // --- 3A. Pobierz tłumaczenia z backendu ---
      const response = await window.api.i18n.load(newLang)

      if (response.success) {
        // --- 3B. Zaktualizuj i18n w aplikacji ---
        i18n.global.setLocaleMessage(newLang, response.data)

        // DODANA LINIJKA: Faktyczne przełączenie aktywnego języka w vue-i18n!
        i18n.global.locale.value = newLang

        selectedLanguage.value = newLang
        localStorage.setItem('app_lang', newLang)
      } else {
        console.error('Nie można załadować tłumaczeń:', response.error)
      }
    } catch (e) {
      console.error('Błąd symulacji tłumaczeń', e)
    } finally {
      isLoadingTranslations.value = false
    }
  }

  return {
    selectedLanguage,
    availableLanguages,
    isLoadingTranslations,
    sessionPassword,
    setLanguage,
    // Eksportujemy nasze gettery na zewnątrz
    uiLanguages,
    currentLanguageDetails
  }
})
