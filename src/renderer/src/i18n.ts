import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import pl from './locales/pl.json'

const i18n = createI18n({
  legacy: false,
  locale: 'pl',
  fallbackLocale: 'en',
  messages: {
    pl,
    en
  }
})

export default i18n
