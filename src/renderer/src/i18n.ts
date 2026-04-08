// src/renderer/i18n.ts
import { createI18n } from 'vue-i18n'
import enTranslations from '../../shared/locales/en.json'
import type { AppLanguage } from '@shared/schemas/langSchemas'

// IMPORTUJEMY TWÓJ TYP
export type AppMessages = typeof enTranslations

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,

  // POPRAWKA: Rzutujemy na AppLanguage, żeby TS wiedział, co tu wolno wrzucać
  locale: 'en' as AppLanguage,
  fallbackLocale: 'en' as AppLanguage,

  messages: {
    en: enTranslations
  }
})
