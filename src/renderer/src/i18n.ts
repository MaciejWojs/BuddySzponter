// src/renderer/i18n.ts
import { createI18n } from 'vue-i18n'
import erTranslations from '../../shared/locales/er.json'
import { AppLanguage } from 'src/shared/schemas/langSchemas'

// IMPORTUJEMY TWÓJ TYP

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,

  // POPRAWKA: Rzutujemy na AppLanguage, żeby TS wiedział, co tu wolno wrzucać
  locale: 'er' as AppLanguage,
  fallbackLocale: 'er' as AppLanguage,

  messages: {
    er: erTranslations
  }
})
