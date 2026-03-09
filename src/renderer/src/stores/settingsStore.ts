import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// 1. IMPORTUJESZ SWOJĄ GLOBALNĄ INSTANCJĘ I18N
// (Podmień ścieżkę na taką, gdzie masz plik z createI18n)
import i18n from '@/i18n'
type AppLanguage = 'pl' | 'en'
export const useSettingsStore = defineStore('settings', () => {
  // --- 1. STAN (STATE) ---
  const selectedLanguage = ref<string>(localStorage.getItem('app_lang') || 'pl')
  const sessionPassword = ref<string>('')

  // --- 2. EFEKTY UBOCZNE (WATCHERS) ---
  watch(selectedLanguage, (newLang) => {
    localStorage.setItem('app_lang', newLang)

    // 2. ZMIANA JĘZYKA W GLOBALNEJ INSTANCJI
    i18n.global.locale.value = newLang as AppLanguage
  })

  // --- 3. AKCJE (ACTIONS) ---
  return {
    selectedLanguage,
    sessionPassword
  }
})
