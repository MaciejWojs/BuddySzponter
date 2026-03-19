import { createI18n } from 'vue-i18n'
import pl from './locales/pl.json'

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'pl',
  fallbackLocale: 'pl',
  messages: {
    pl,
    en: {},
    plX67: {}
  }
})

export default i18n
