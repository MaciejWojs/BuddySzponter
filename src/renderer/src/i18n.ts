import { createI18n } from 'vue-i18n'
import en from '../../shared/locales/en.json'

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
    pl: {},
    plX67: {}
  }
})

export default i18n
