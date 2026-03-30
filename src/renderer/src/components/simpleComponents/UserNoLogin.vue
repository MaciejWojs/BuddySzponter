<template>
  <div class="user-container" @mouseenter="menuOpen = true" @mouseleave="menuOpen = false">
    <div :class="['dropdown-bg', { 'is-open': menuOpen }]" />

    <div class="user-content">
      <div class="avatar-wrapper">
        <UserIconSvg class="user-avatar" />
      </div>

      <div class="user-name">Gość</div>

      <Transition name="fade-slide">
        <div v-if="menuOpen" class="menu-items">
          <button class="menu-item" @click="goToLogin">{{ $t('userMenu1.login') }}</button>
          <button class="menu-item" @click="goToRegister">{{ $t('userMenu1.register') }}</button>
          <hr style="width: 80%; border: 0; border-top: 1px solid #444; margin: 10px 0" />
          <button class="menu-item" @click="openVersionModal">🛠️ Panel wersji</button>
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import UserIconSvg from '@renderer/assets/images/components/Usericon2.svg?component'

const menuOpen = ref(false)
const showVersionModal = ref(false)
const versionResult = ref<string | null>(null)
const router = useRouter()

function goToLogin(): void {
  router.push('/login')
  showVersionModal.value = false
}

function goToRegister(): void {
  router.push('/register')
  showVersionModal.value = false
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
    const res = await window.api.core.getSupportedVersions()
    if (res.success) {
      const wersje = res.data.map((v) => v.version).join(', ')
      versionResult.value = 'Dostępne wersje: ' + wersje
    } else {
      versionResult.value = 'Błąd pobierania wersji: ' + res.message
    }
  } catch (e) {
    versionResult.value = 'Błąd pobierania wersji: ' + e
  }
}

async function handleVersionStatus(): Promise<void> {
  try {
    const currentVersion = String(await window.api.core.getAppVersion())
      .replace(/^v/i, '')
      .trim()
    const res = await window.api.core.getSupportedVersions()
    if (!res.success || !res.data) {
      versionResult.value = 'Błąd pobierania wersji z API: ' + res.message
      return
    }
    const versions = res.data
    const sortedVersions = [...versions].sort((a, b) => compareVersions(b.version, a.version))
    const latestApiVersion = sortedVersions[0]
    const currentVersionData = versions.find(
      (v) => v.version.replace(/^v/i, '').trim() === currentVersion
    )
    let status = ''
    if (!versions || versions.length === 0) {
      status = 'UNKNOWN'
    } else if (!currentVersionData) {
      if (compareVersions(currentVersion, latestApiVersion.version) > 0) {
        status = 'UP_TO_DATE'
      } else {
        status = 'UPDATE_REQUIRED'
      }
    } else if (!currentVersionData.isSupported) {
      status = 'UPDATE_REQUIRED'
    } else if (compareVersions(latestApiVersion.version, currentVersion) > 0) {
      status = 'UPDATE_AVAILABLE'
    } else {
      status = 'UP_TO_DATE'
    }
    versionResult.value = 'Status wersji: ' + status
  } catch (e) {
    versionResult.value = 'Błąd sprawdzania statusu wersji: ' + e
  }
}

function compareVersions(v1: string, v2: string): number {
  const cleanV1 = String(v1).replace(/^v/i, '').trim()
  const cleanV2 = String(v2).replace(/^v/i, '').trim()
  const parts1 = cleanV1.split('.').map((p) => parseInt(p, 10))
  const parts2 = cleanV2.split('.').map((p) => parseInt(p, 10))
  const len = Math.max(parts1.length, parts2.length)
  for (let i = 0; i < len; i++) {
    const p1 = isNaN(parts1[i]) ? 0 : parts1[i]
    const p2 = isNaN(parts2[i]) ? 0 : parts2[i]
    if (p1 > p2) return 1
    if (p1 < p2) return -1
  }
  return 0
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
  padding: 32px 28px 24px 28px;
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
</style>

<style scoped>
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
  width: 90px;
  height: 90px;
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
  width: 90px;
  height: 90px;
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
