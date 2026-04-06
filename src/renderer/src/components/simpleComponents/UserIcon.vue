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
      <div class="avatar">
        <img
          v-if="avatarPreview || userAvatarUrl"
          :src="avatarPreview || userAvatarUrl || ''"
          alt="Awatar użytkownika"
        />
        <UserIconSvg v-else class="avatar-fallback" />
      </div>

      <div class="user-name">{{ displayNickname }}</div>

      <Transition name="fade-slide">
        <div v-if="menuOpen" class="menu-items">
          <button class="menu-item" @click="openUserModal">Twoje konto</button>
          <button class="menu-item">Nagrania sesji</button>
          <button class="menu-item logout" @click="handleLogout">Wyloguj sie</button>
          <hr style="width: 80%; border: 0; border-top: 1px solid #444; margin: 10px 0" />
          <button class="menu-item" @click="openVersionModal">Wersja aplikacji</button>
        </div>
      </Transition>

      <Transition name="fade-slide">
        <div v-if="showUserModal" class="user-modal-overlay" @click.self="closeUserModal">
          <div class="user-modal">
            <button class="close-btn" @click="closeUserModal">&times;</button>
            <h2 class="modal-title">Panel uzytkownika</h2>

            <div class="user-profile-preview">
              <div class="avatar">
                <img
                  v-if="avatarPreview || userAvatarUrl"
                  :src="avatarPreview || userAvatarUrl || ''"
                  alt="Awatar użytkownika"
                />
                <UserIconSvg v-else class="avatar-fallback" />
              </div>
            </div>

            <div class="account-fields">
              <div class="account-field">
                <span class="field-label">Adres email</span>
                <span class="field-value">{{ displayEmail }}</span>
              </div>
              <div class="account-field">
                <span class="field-label">Pseudonim</span>
                <span class="field-value">{{ displayNickname }}</span>
              </div>
            </div>

            <div class="modal-btns">
              <button class="menu-item modal-btn" @click="handlePasswordReset">
                🔐 Resetowanie hasla
              </button>

              <label class="menu-item modal-btn avatar-upload-label" for="avatar-upload-input">
                🖼️ Zmien awatar
              </label>
              <input
                id="avatar-upload-input"
                class="avatar-upload-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                @change="handleAvatarChange"
              />

              <button class="menu-item modal-btn danger-btn" @click="handleDeleteAccount">
                🗑️ Usun konto
              </button>
            </div>

            <div class="modal-result">
              <pre v-if="userPanelResult !== null">{{ userPanelResult }}</pre>
            </div>
          </div>
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
import { useUserStore } from '@renderer/stores/userStore'
import UserIconSvg from '@renderer/assets/images/components/usericon.svg?component'
import { useRouter } from 'vue-router'

const menuOpen = ref(false)
const showUserModal = ref(false)
const showVersionModal = ref(false)
const versionResult = ref<string | null>(null)
const userPanelResult = ref<string | null>(null)
const avatarPreview = ref<string | null>(null)
const settingsStore = useSettingsStore()
const userStore = useUserStore()
const router = useRouter()

const { supportedVersions } = storeToRefs(settingsStore)
const { currentUser } = storeToRefs(userStore)

const isUpdateRequired = computed(() => settingsStore.isUpdateRequired)
const versionStatus = computed(() => settingsStore.versionStatus)
const displayNickname = computed(() => currentUser.value?.nickname || 'Uzytkownik')
const displayEmail = computed(() => currentUser.value?.email || '-')
const userAvatarUrl = computed(() => {
  if (!currentUser.value?.avatar) {
    return null
  }
  return `http://localhost/avatar/${currentUser.value.avatar}/256.webp`
})

onMounted(() => {
  void settingsStore.checkVersionStatus()
  if (!currentUser.value) {
    void userStore.fetchCurrentUser(true)
  }
})

async function retryVersionCheck(): Promise<void> {
  await settingsStore.checkVersionStatus()
}

function openUserModal(): void {
  showUserModal.value = true
  userPanelResult.value = null
}

function closeUserModal(): void {
  showUserModal.value = false
  userPanelResult.value = null
}

function handlePasswordReset(): void {
  userPanelResult.value = 'Link do resetu hasla zostal wyslany na adres: ' + displayEmail.value
}

async function handleAvatarChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }

  if (avatarPreview.value) {
    URL.revokeObjectURL(avatarPreview.value)
  }

  avatarPreview.value = URL.createObjectURL(file)
  try {
    const buffer = await file.arrayBuffer()
    const userId = currentUser.value?.id ? String(currentUser.value.id) : null

    const response = await window.api.users.uploadAvatarByBuffer(
      buffer,
      file.name,
      file.type,
      userId
    )

    if (!response.success) {
      userPanelResult.value = response.message
      input.value = ''
      return
    }

    await userStore.fetchCurrentUser(true)
    userPanelResult.value = 'Awatar zostal zmieniony na: ' + file.name
  } catch (error) {
    userPanelResult.value =
      error instanceof Error ? error.message : 'Wystapil blad podczas zmiany awatara.'
  }
  input.value = ''
}

function handleDeleteAccount(): void {
  const accepted = window.confirm(
    'Czy na pewno chcesz usunac konto? Tej operacji nie mozna cofnac.'
  )
  userPanelResult.value = accepted
    ? 'Zadanie usuniecia konta zostalo przyjete.'
    : 'Usuwanie konta anulowane.'
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

async function handleLogout(): Promise<void> {
  await userStore.logout()
  showUserModal.value = false
  showVersionModal.value = false
  await router.push('/login')
}
</script>

<style scoped>
.user-modal-overlay {
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

.user-modal {
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

.user-profile-preview {
  width: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.profile-avatar {
  width: 86px;
  height: 86px;
  border-radius: 50%;
  background: #1e103c;
  padding: 4px;
  border: 2px solid rgba(183, 148, 244, 0.55);
}

.profile-avatar :deep(path) {
  fill: #cbb2ff;
}

.profile-avatar-image {
  width: 100%;
  height: 100%;
  max-width: 86px;
  max-height: 86px;
  object-fit: cover;
  object-position: center;
  border-radius: 50%;
  display: block;
  background: #1e103c;
  margin: 0 auto;
  padding: 0;
}

.avatar {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #8b5cf6;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e1533;
  margin: 0 auto 18px auto;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}

.avatar-fallback {
  width: 100%;
  height: 100%;
  display: block;
}

.account-fields {
  width: 100%;
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
}

.account-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 9px 12px;
  border-radius: 10px;
  background: rgba(34, 26, 54, 0.42);
  border: 1px solid rgba(183, 148, 244, 0.25);
}

.field-label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.7;
}

.field-value {
  font-size: 0.96rem;
}

.avatar-upload-label {
  display: inline-flex;
  align-items: center;
}

.avatar-upload-input {
  display: none;
}

.danger-btn {
  color: #ff9090;
}

.danger-btn:hover {
  color: #ff6b6b;
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
  bottom: -12px;
  background-color: #0a0514;
  border-radius: 150px;
  transition:
    transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.3s ease,
    box-shadow 0.3s ease;
  z-index: -1;
  opacity: 0;
  transform: scaleY(0);
  transform-origin: top center;
}

.dropdown-bg.is-open {
  opacity: 1;
  transform: scaleY(1);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.user-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10px;
}

/* Avatar container for both top-right and modal */
.avatar {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #8b5cf6;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e1533;
  margin: 0 auto 18px auto;
  box-shadow: 0 4px 24px 0 rgba(0, 0, 0, 0.18);
  transition: transform 0.3s ease;
}

.user-container:hover .avatar {
  transform: scale(1.05);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
}

.avatar-fallback {
  width: 100%;
  height: 100%;
  display: block;
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
