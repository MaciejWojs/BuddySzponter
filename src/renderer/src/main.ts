import './assets/main.css'

import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import App from './App.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const i18n = createI18n({
  locale: 'pl',
  fallbackLocale: 'en',
  messages: {
    en: {
      message: {
        hello: 'Hello world!'
      }
    },
    pl: {
      message: {
        hello: 'Witaj świecie!'
      }
    }
  }
})

const pinia = createPinia()

const app = createApp(App)
app.use(router)
app.use(pinia)
app.use(i18n)
app.mount('#app')
