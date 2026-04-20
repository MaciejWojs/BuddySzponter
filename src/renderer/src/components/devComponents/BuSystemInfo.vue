<template>
  <div class="col-span-1 md:col-span-2 flex flex-col gap-5">
    <div
      class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5 flex flex-row gap-2.5 items-center flex-wrap"
    >
      <h2 class="text-xl font-semibold m-0 mr-auto">Języki / Core</h2>
      <button
        class="p-2.5 bg-blue-500 text-white border-none rounded cursor-pointer font-bold hover:bg-blue-600 transition-colors"
        @click="handleSupportedVersions"
      >
        🌐 Supported Versions
      </button>
      <button
        class="p-2.5 bg-blue-500 text-white border-none rounded cursor-pointer font-bold hover:bg-blue-600 transition-colors"
        @click="handleLanguages"
      >
        🈯 Lista Języków
      </button>
      <button
        class="p-2.5 bg-blue-500 text-white border-none rounded cursor-pointer font-bold hover:bg-blue-600 transition-colors"
        @click="handleLocale"
      >
        🌍 Pobierz Locale (pl)
      </button>
    </div>

    <div
      class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5 flex flex-row gap-2.5 items-center flex-wrap"
    >
      <h2 class="text-xl font-semibold m-0 mr-auto">Wersje</h2>
      <button
        class="p-2.5 bg-blue-500 text-white border-none rounded cursor-pointer font-bold hover:bg-blue-600 transition-colors"
        @click="handleCurrentVersion"
      >
        🔢 Aktualna wersja
      </button>
      <button
        class="p-2.5 bg-blue-500 text-white border-none rounded cursor-pointer font-bold hover:bg-blue-600 transition-colors"
        @click="handleAvailableVersions"
      >
        📋 Dostępne wersje
      </button>
      <button
        class="p-2.5 bg-blue-500 text-white border-none rounded cursor-pointer font-bold hover:bg-blue-600 transition-colors"
        @click="handleVersionStatus"
      >
        ✅ Status wersji
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@renderer/stores/settingsStore'

const emit = defineEmits<{ (e: 'log-result', action: string, data: unknown): void }>()
const settingsStore = useSettingsStore()

const handleAction = async (
  actionName: string,
  actionFn: () => Promise<unknown>
): Promise<void> => {
  emit('log-result', actionName, 'Ładowanie...')
  try {
    const res = await actionFn()
    emit('log-result', actionName, res)
  } catch (e) {
    emit('log-result', `${actionName}_ERROR`, e)
  }
}

const handleSupportedVersions = (): Promise<void> =>
  handleAction('SUPPORTED_VERSIONS', () => window.api.core.getSupportedVersions())
const handleLanguages = (): Promise<void> =>
  handleAction('LANGUAGES', () => window.api.core.getAvailableLanguages())
const handleLocale = (): Promise<void> =>
  handleAction('LOCALE', () => window.api.core.getLocale('pl'))

// Zmiana tutaj: dodano 'async' przed () => ...
const handleCurrentVersion = (): Promise<void> =>
  handleAction('CURRENT_VERSION', async () => settingsStore.getCurrentVersion())

const handleAvailableVersions = (): Promise<void> =>
  handleAction('AVAILABLE_VERSIONS', async () => {
    await settingsStore.fetchSupportedVersions()
    return settingsStore.supportedVersions
  })

// Jeśli checkVersionStatus() również zwraca wartość synchroniczną, zrób to samo:
// handleAction('VERSION_STATUS', async () => settingsStore.checkVersionStatus())
const handleVersionStatus = (): Promise<void> =>
  handleAction('VERSION_STATUS', () => settingsStore.checkVersionStatus())
</script>
