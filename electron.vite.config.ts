import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import VueRouter from 'vue-router/vite'
import { VueRouterAutoImports } from 'vue-router/unplugin'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [
      VueRouter({
        routesFolder: 'src/renderer/src/pages'
      }),
      vue(),
      ui({
        autoImport: {
          imports: [
            'vue',
            '@vueuse/core',
            'pinia',
            'vee-validate',
            'vue-i18n',
            'vue-router',
            VueRouterAutoImports
          ]
        }
      })
    ]
  }
})
