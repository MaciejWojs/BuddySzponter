import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import VueRouter from 'vue-router/vite'
import { VueRouterAutoImports } from 'vue-router/unplugin'
import svgLoader from 'vite-svg-loader'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@images': resolve('src/renderer/src/assets/images')
      }
    },
    plugins: [
      VueRouter({
        routesFolder: 'src/renderer/src/pages'
      }),
      svgLoader(),
      vue(),
      ui({
        autoImport: {
          imports: [
            'vue',
            '@vueuse/core',
            'pinia',
            'vee-validate',
            { from: '@vee-validate/zod', imports: ['toTypedSchema'] },
            'vue-i18n',
            'vue-router',
            { from: 'zod', imports: ['z'] },
            VueRouterAutoImports
          ],
          eslintrc: {
            enabled: true,
            filepath: '.eslintrc-auto-import.json',
            globalsPropValue: true
          }
        }
      })
    ]
  }
})
