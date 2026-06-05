import './assets/main.css'

import { addCollection } from '@iconify/vue'
import lucideIcons from '@iconify-json/lucide/icons.json'
addCollection(lucideIcons)

import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { createPinia } from 'pinia'
import ui from '@nuxt/ui/vue-plugin'
import App from './App.vue'
import { i18n } from './i18n'
import { useUserStore } from '@renderer/stores/userStore'

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const pinia = createPinia()

router.beforeEach(async (to) => {
  const userStore = useUserStore(pinia)

  const normalizedPath = to.path.toLowerCase()
  const isAuthPage = normalizedPath === '/login' || normalizedPath === '/register'

  if (userStore.isAuthenticated && isAuthPage) {
    return '/'
  }

  return true
})

const app = createApp(App)
app.use(router)
app.use(pinia)
app.use(i18n)
app.use(ui)
app.mount('#app')
window.addEventListener('dragover', (e) => e.preventDefault())
window.addEventListener('drop', (e) => e.preventDefault())
