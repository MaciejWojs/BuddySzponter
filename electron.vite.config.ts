import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import VueRouter from 'vue-router/vite'
import { VueRouterAutoImports } from 'vue-router/unplugin'
import svgLoader from 'vite-svg-loader'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@images': resolve('src/renderer/src/assets/images'),
        'vue-i18n': 'vue-i18n/dist/vue-i18n.runtime.esm-browser.prod.js'
      }
    },
    optimizeDeps: {
      include: [
        'vue',
        '@vueuse/core',
        'pinia',
        'vee-validate',
        '@vee-validate/zod',
        'vue-i18n',
        'vue-router',
        'zod',
        'zxcvbn',
        'nanoid/non-secure'
      ]
    },
    plugins: [
      VueRouter({
        routesFolder: 'src/renderer/src/pages'
      }),
      svgLoader(),
      vue(),
      VueI18nPlugin({
        // Wskazujemy gdzie są Twoje pliki z tłumaczeniami
        include: [resolve(__dirname, './src/shared/locales/**')],
        compositionOnly: true,
        fullInstall: false
      }),
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
