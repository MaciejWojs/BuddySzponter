import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSettingsStore } from '@renderer/stores/settingsStore'
import { useSocketStore } from '@renderer/stores/socketStore'
import { useUserStore } from '@renderer/stores/userStore'
import { useDeviceStore } from '@renderer/stores/deviceStore'

/**
 * Tu w przyszłości: `autoUpdater.checkForUpdates()`, pobieranie paczki, restart po instalacji.
 * Obecnie sprawdzanie wersji odbywa się w `settingsStore.initSettings()`.
 */
async function runAutoUpdaterPlaceholder(): Promise<void> {
  await Promise.resolve()
}

export const useBootStore = defineStore('boot', () => {
  const isBootComplete = ref(false)
  const currentStepKey = ref('boot.loading')
  let bootPromise: Promise<void> | null = null

  const setStep = (key: string): void => {
    currentStepKey.value = key
  }

  const runMainWindowBoot = async (): Promise<void> => {
    if (bootPromise) {
      await bootPromise
      return
    }

    bootPromise = (async (): Promise<void> => {
      try {
        const settingsStore = useSettingsStore()
        setStep('boot.loadingSettings')
        await settingsStore.initSettings()

        const socketStore = useSocketStore()
        setStep('boot.loadingSocket')
        socketStore.init()

        const userStore = useUserStore()
        setStep('boot.loadingSession')
        await userStore.initSession()

        const deviceStore = useDeviceStore()
        setStep('boot.loadingDevices')
        await deviceStore.refreshMicrophones()

        setStep('boot.preparingViews')
        await Promise.all([import('@renderer/pages/settings.vue')])

        setStep('boot.preparingChatWindow')
        try {
          await window.api.app.prewarmHostChatWindow()
        } catch (e) {
          console.warn('[Boot] prewarm host chat window failed:', e)
        }

        setStep('boot.preparingGuestWindow')
        try {
          await window.api.app.prewarmGuestWindow()
        } catch (e) {
          console.warn('[Boot] prewarm guest window failed:', e)
        }

        setStep('boot.preparingHostWidget')
        try {
          await window.api.app.prewarmHostWidgetWindow()
        } catch (e) {
          console.warn('[Boot] prewarm host widget failed:', e)
        }

        setStep('boot.preparingHostWidgetPopup')
        try {
          await window.api.app.prewarmHostWidgetPopup()
        } catch (e) {
          console.warn('[Boot] prewarm host widget popup failed:', e)
        }

        setStep('boot.checkingUpdates')
        await runAutoUpdaterPlaceholder()
      } catch (e) {
        console.error('[Boot] sequence failed:', e)
      } finally {
        isBootComplete.value = true
      }
    })()

    await bootPromise
  }

  return {
    isBootComplete,
    currentStepKey,
    runMainWindowBoot
  }
})
