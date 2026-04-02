<template>
  <div class="user-container" @mouseenter="menuOpen = true" @mouseleave="menuOpen = false">
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

    <div :class="['dropdown-bg', { 'is-open': menuOpen }]" />

    <div class="user-content">
      <div class="avatar-wrapper">
        <UserIconSvg class="user-avatar" />
      </div>

      <div class="user-name">{{ user.name }}</div>

      <Transition name="fade-slide">
        <div v-if="menuOpen" class="menu-items">
          <button class="menu-item">Ustawienia konta</button>
          <button class="menu-item">Nagrania sesji</button>
          <button class="menu-item logout">Wyloguj sie</button>
          <hr style="width: 80%; border: 0; border-top: 1px solid #444; margin: 10px 0" />
          <button class="menu-item" @click="openVersionModal">Panel wersji</button>
        </div>
      </Transition>

      <Transition name="fade-slide">
        <div v-if="showVersionModal" class="version-modal-overlay" @click.self="closeVersionModal">
          <div class="version-modal">
            <button class="close-btn" @click="closeVersionModal">&times;</button>
            <h2 class="modal-title">Panel kontroli wersji</h2>
            <div class="modal-btns">
              <button class="menu-item modal-btn" @click="handleCurrentVersion">
                🔢 Aktualna wersja
              </button>
              <button class="menu-item modal-btn" @click="handleAvailableVersions">
                📋 Dostępne wersje
              </button>
              <button class="menu-item modal-btn" @click="handleVersionStatus">
                ✅ Status wersji
              </button>
            </div>
            <div class="modal-result">
              <pre v-if="versionResult !== null">{{ versionResult }}</pre>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@renderer/stores/settingsStore'
import UserIconSvg from '@renderer/assets/images/components/usericon.svg?component'

const user = ref({
  name: 'Bradley Lawlor'
})

const menuOpen = ref(false)
const showVersionModal = ref(false)
const versionResult = ref<string | null>(null)
const settingsStore = useSettingsStore()
const { supportedVersions } = storeToRefs(settingsStore)
const isUpdateRequired = computed(() => settingsStore.isUpdateRequired)
const versionStatus = computed(() => settingsStore.versionStatus)

onMounted(() => {
  void settingsStore.checkVersionStatus()
})

async function retryVersionCheck(): Promise<void> {
  await settingsStore.checkVersionStatus()
}

function openVersionModal(): void {
  showVersionModal.value = true
  versionResult.value = null
}

function closeVersionModal(): void {
  showVersionModal.value = false
  versionResult.value = null
}

async function handleCurrentVersion(): Promise<void> {
  try {
    const version = await window.api.core.getAppVersion()
    versionResult.value = 'Aktualna wersja aplikacji: ' + version
  } catch (e) {
    versionResult.value = 'Błąd pobierania wersji: ' + e
  }
}

async function handleAvailableVersions(): Promise<void> {
  try {
    await settingsStore.fetchSupportedVersions()
    console.log('Pobrane wersje:', supportedVersions.value)
    if (supportedVersions.value && supportedVersions.value.length > 0) {
      const wersje = supportedVersions.value.map((v) => v.version).join(', ')
      versionResult.value = 'Dostępne wersje: ' + wersje
    } else {
      versionResult.value = 'Brak dostępnych wersji.'
    }
  } catch (e) {
    versionResult.value = 'Błąd pobierania wersji: ' + e
  }
}

async function handleVersionStatus(): Promise<void> {
  try {
    const status = await settingsStore.checkVersionStatus()
    versionResult.value = 'Status wersji: ' + status
  } catch (e) {
    versionResult.value = 'Błąd sprawdzania statusu wersji: ' + e
  }
}
</script>

<style scoped>
.version-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.45);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.version-modal {
  background: #18122b;
  border-radius: 18px;
  box-shadow: 0 8px 40px #000a;
  padding: 32px 28px 24px;
  min-width: 340px;
  max-width: 90vw;
  min-height: 220px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 18px;
  background: none;
  border: none;
  color: #fff;
  font-size: 2rem;
  cursor: pointer;
  z-index: 10;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #b794f4;
}

.modal-title {
  color: #b794f4;
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 18px;
  text-align: center;
}

.modal-btns {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 18px;
  width: 100%;
}

.modal-btn {
  width: 100%;
  text-align: left;
  padding-left: 18px;
}

.modal-result {
  width: 100%;
  min-height: 32px;
  background: #221a36;
  color: #a6e22e;
  border-radius: 8px;
  padding: 10px 14px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  margin-top: 6px;
  white-space: pre-wrap;
  word-break: break-word;
  box-sizing: border-box;
}

.update-required-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
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

/* Kontener pozycjonujacy w prawym gornym rogu */
.user-container {
  position: fixed;
  top: 20px;
  right: 40px;
  z-index: 1000;
  width: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

/* Magiczne tlo, ktore sie rozszerza */
.dropdown-bg {
  position: absolute;
  top: -10px;
  left: 0;
  right: 0;
  bottom: 100%;
  background-color: #0a0514;
  border-radius: 150px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: -1;
  opacity: 0;
}

.dropdown-bg.is-open {
  height: 370px;
  bottom: auto;
  opacity: 1;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.user-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10px;
}

.avatar-wrapper {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  padding: 6px;
  background: rgba(30, 16, 60, 0.18);
  box-shadow: 0 4px 24px 0 rgba(0, 0, 0, 0.18);
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.3s ease;
}

.user-container:hover .avatar-wrapper {
  transform: scale(1.05);
}

.user-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  background: #1e103c;
}

.user-name {
  color: #b794f4;
  font-size: 1.4rem;
  font-weight: 600;
  margin-top: 24px;
  text-align: center;
  pointer-events: none;
}

.menu-items {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-top: 20px;
  gap: 12px;
}

.menu-item {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 0.95rem;
  cursor: pointer;
  transition: color 0.2s;
  padding: 5px 10px;
  white-space: nowrap;
}

.menu-item:hover {
  color: #b794f4;
}

.menu-item.logout {
  margin-top: 5px;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease-out;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
