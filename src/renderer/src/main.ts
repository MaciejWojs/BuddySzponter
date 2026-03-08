import './assets/main.css'

import { addCollection } from '@iconify/vue'
import lucideIcons from '@iconify-json/lucide/icons.json'
addCollection(lucideIcons)

import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import pl from './locales/pl.json'
import en from './locales/en.json'
import ui from '@nuxt/ui/vue-plugin'
import App from './App.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const i18n = createI18n({
  locale: 'pl-PL',
  fallbackLocale: 'en-US',
  messages: {
    'pl-PL': pl,
    'en-US': en
  }
})

const pinia = createPinia()

const app = createApp(App)
app.use(router)
app.use(pinia)
app.use(i18n)
app.use(ui)
app.mount('#app')
