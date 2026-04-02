<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@renderer/stores/settingsStore'

const toaster = { position: 'top-right', duration: 3000, dismissible: true, max: 3, expand: false }

const store = useSettingsStore()
store.initSettings()

const isUpdateRequired = computed(() => store.isUpdateRequired)
const versionStatus = computed(() => store.versionStatus)

async function retryVersionCheck(): Promise<void> {
  await store.checkVersionStatus()
}
</script>
<template>
  <UApp :toaster="toaster">
    <div :class="['app-shell', { blurred: isUpdateRequired }]">
      <router-view />
    </div>

    <div
      v-if="isUpdateRequired"
      class="update-required-overlay"
      role="alertdialog"
      aria-modal="true"
    >
      <div class="update-required-card">
        <h2>Wymagana aktualizacja aplikacji</h2>
        <p>
          Ta wersja nie jest juz wspierana. Zainstaluj najnowsza wersje, aby odblokowac aplikacje.
        </p>
        <p class="status-line">Status wersji: {{ versionStatus }}</p>
        <button type="button" class="retry-button" @click="retryVersionCheck">
          Sprawdz ponownie
        </button>
      </div>
    </div>
  </UApp>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
}

.app-shell.blurred {
  filter: blur(10px);
  pointer-events: none;
  user-select: none;
}

.update-required-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(10, 10, 18, 0.6);
  backdrop-filter: blur(6px);
}

.update-required-card {
  width: min(560px, 100%);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(24, 24, 34, 0.96);
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.35);
  text-align: center;
}

.update-required-card h2 {
  margin: 0 0 12px;
  font-size: 1.5rem;
}

.update-required-card p {
  margin: 0;
  line-height: 1.5;
}

.status-line {
  margin-top: 14px;
  opacity: 0.8;
  font-size: 0.95rem;
}

.retry-button {
  margin-top: 16px;
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  font-weight: 600;
  cursor: pointer;
  color: #111827;
  background: #d0f224;
}
</style>
