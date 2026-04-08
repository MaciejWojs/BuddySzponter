<script setup lang="ts">
// Importy komponentów i zasobów używanych przez widok głównego menu.
import GuestForm from '@renderer/components/forms/GuestForm.vue'
import HostForm from '@renderer/components/forms/HostForm.vue'
import NavBar from '@renderer/components/UI/NavBar.vue'
import type { NavBarItem } from '@renderer/components/UI/NavBar.vue'
import DevicesButton from '@renderer/components/simpleComponents/DevicesButton.vue'
import HomeButton from '@renderer/components/simpleComponents/HomeButton.vue'
import SettingButton from '@renderer/components/simpleComponents/SettingButton.vue'
import BuLanguageSelector from '@renderer/components/simpleComponents/BuLanguageSelector.vue'
import UserIcon from '@renderer/components/simpleComponents/UserIcon.vue'
import UserNoLogin from '@renderer/components/simpleComponents/UserNoLogin.vue'
import { useUserStore } from '@renderer/stores/userStore'
import { storeToRefs } from 'pinia'
import buddySzponterLogo from '@images/buddyszponterLogo.png'

const userStore = useUserStore()
const { isAuthenticated } = storeToRefs(userStore)

// Stan aktywnej zakładki w dolnym pasku nawigacji.
const activeNav = ref('home')

// Definicja pozycji nawigacji przekazywanych do komponentu NavBar.
const navItems: NavBarItem[] = [
  {
    name: 'settings',
    component: SettingButton
  },
  {
    name: 'home',
    component: HomeButton
  },
  {
    name: 'devices',
    component: DevicesButton
  }
]
</script>

<template>
  <!-- Główny widok menu: górna nawigacja, dwie kolumny akcji i stopka z logo. -->
  <section class="menu-page">
    <!-- Selektor języka osadzony w lewym górnym rogu ekranu. -->
    <div class="menu-lang-selector">
      <BuLanguageSelector />
    </div>

    <!-- Ikona użytkownika zależna od statusu zalogowania. -->
    <UserIcon v-if="isAuthenticated" />
    <UserNoLogin v-else />
    <header class="menu-topbar">
      <!-- Pasek nawigacyjny z ikonowymi przyciskami sekcji. -->
      <NavBar v-model="activeNav" :items="navItems" />
    </header>

    <main class="menu-content">
      <article class="menu-column">
        <!-- Sekcja gościa: udostępnienie sterowania przez kod sesji. -->
        <h2>{{ $t('guestForm.title') }}</h2>
        <p>{{ $t('guestForm.description') }}</p>
        <GuestForm />
      </article>

      <article class="menu-column">
        <!-- Sekcja hosta: przejęcie sterowania z użyciem kodu i hasła. -->
        <h2>{{ $t('hostForm.title') }}</h2>
        <p>{{ $t('hostForm.description') }}</p>
        <HostForm />
      </article>
    </main>

    <footer class="menu-footer">
      <!-- Logo aplikacji prezentowane w stopce widoku. -->
      <img :src="buddySzponterLogo" :alt="$t('common.logoAlt')" class="menu-logo" />
    </footer>
  </section>
</template>

<style scoped>
/*
  Style widoku Menu:
  .menu-page    - główny kontener strony
  .menu-topbar  - obszar górnej nawigacji
  .menu-content - sekcja kolumn formularzy
  .menu-footer  - stopka z logo aplikacji
*/
.menu-lang-selector {
  position: absolute;
  top: 20px;
  left: 24px;
  z-index: 10;
}

.menu-page {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: 20px 56px 24px;
  position: relative;
}

.menu-topbar {
  display: flex;
  justify-content: center;
  padding-top: 0;
}

.menu-topbar :deep(button) {
  min-width: 64px;
  min-height: 64px;
  aspect-ratio: 1/1;
  font-size: 22px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  box-sizing: border-box;
  background: none;
}
.menu-topbar :deep(svg) {
  width: 70%;
  height: 70%;
  max-width: 70%;
  max-height: 70%;
  object-fit: contain;
  display: block;
  margin: auto;
}

.menu-content {
  display: grid;
  grid-template-columns: repeat(2, minmax(300px, 1fr));
  align-items: start;
  justify-content: center;
  gap: 120px;
  align-self: center;
  padding-top: 0;
}

.menu-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.menu-column h2 {
  font-size: 35px;
  margin-bottom: 4px;
}

.menu-column p {
  font-size: 18px;
  opacity: 0.85;
  margin-bottom: 18px;
}

.menu-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-bottom: 8px;
}

.menu-logo {
  width: 260px;
  max-width: 100%;
  height: auto;
}

@media (max-width: 1100px) {
  .menu-page {
    padding: 12px 6vw 16px;
    overflow-y: auto;
  }

  .menu-lang-selector {
    top: 8px;
    left: 8px;
  }

  .menu-content {
    grid-template-columns: 1fr;
    gap: 32px;
    align-self: start;
    padding-top: 10px;
  }

  .menu-column h2 {
    font-size: 24px;
  }

  .menu-column p {
    font-size: 14px;
  }

  .menu-footer {
    margin-top: 10px;
  }

  .menu-logo {
    width: 120px;
  }
}

@media (max-width: 600px) {
  .menu-page {
    padding: 6px 2vw 10px;
  }

  .menu-lang-selector {
    top: 2px;
    left: 2px;
  }

  .menu-content {
    gap: 18px;
    padding-top: 4px;
  }
  .menu-column h2 {
    font-size: 18px;
  }
  .menu-column p {
    font-size: 12px;
  }
  .menu-footer {
    margin-top: 6px;
  }
  .menu-logo {
    width: 80px;
  }
  .menu-topbar :deep(button) {
    min-width: 44px;
    min-height: 44px;
    border-radius: 10px;
    font-size: 16px;
  }
}
</style>
