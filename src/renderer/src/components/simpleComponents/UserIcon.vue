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
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSettingsStore } from '@renderer/stores/settingsStore'
import UserIconSvg from '@renderer/assets/images/components/usericon.svg?component'

const user = ref({
  name: 'Bradley Lawlor'
})

const menuOpen = ref(false)
const settingsStore = useSettingsStore()
const isUpdateRequired = computed(() => settingsStore.isUpdateRequired)
const versionStatus = computed(() => settingsStore.versionStatus)

onMounted(() => {
  void settingsStore.checkVersionStatus()
})

async function retryVersionCheck(): Promise<void> {
  await settingsStore.checkVersionStatus()
}
</script>

<style scoped>
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
