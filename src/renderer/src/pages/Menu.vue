import UserNoLogin from '@renderer/components/simpleComponents/UserNoLogin.vue'
<script setup lang="ts">
// --- Component and asset imports ---
import GuestForm from '@renderer/components/forms/GuestForm.vue'
import HostForm from '@renderer/components/forms/HostForm.vue'
import NavBar from '@renderer/components/UI/NavBar.vue'
import type { NavBarItem } from '@renderer/components/UI/NavBar.vue'
import DevicesButton from '@renderer/components/simpleComponents/DevicesButton.vue'
import HomeButton from '@renderer/components/simpleComponents/HomeButton.vue'
import SettingButton from '@renderer/components/simpleComponents/SettingButton.vue'
import buddySzponterLogo from '@images/buddyszponterLogo.png'

// --- Navigation state: currently active tab ---
const activeNav = ref('home')

// --- Navigation items: icon buttons for NavBar ---
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
  <!--
    Main menu view:
    - Top navigation bar (NavBar)
    - Two columns: Share Control / Take Control
    - Footer with logo
  -->
  <section class="menu-page">
    <!-- User profile icon in top right corner -->
    <UserNoLogin />
    <header class="menu-topbar">
      <!-- Navigation bar with icon buttons -->
      <NavBar v-model="activeNav" :items="navItems" />
    </header>

    <main class="menu-content">
      <article class="menu-column">
        <!-- GuestForm: Share control with a friend -->
        <h2>{{ $t('guestForm.title') }}</h2>
        <p>{{ $t('guestForm.description') }}</p>
        <GuestForm />
      </article>

      <article class="menu-column">
        <!-- HostForm: Take control using code/password -->
        <h2>{{ $t('hostForm.title') }}</h2>
        <p>{{ $t('hostForm.description') }}</p>
        <HostForm />
      </article>
    </main>

    <footer class="menu-footer">
      <!-- Application logo in footer -->
      <img :src="buddySzponterLogo" alt="BuddySzponter logo" class="menu-logo" />
    </footer>
  </section>
</template>

<style scoped>
/*
  --- Styles for Menu view ---
  .menu-page      - main container
  .menu-topbar    - top navigation bar
  .menu-content   - main content (two columns)
  .menu-footer    - footer with logo
  .menu-logo      - application logo
  Media queries   - responsive adjustments
*/
.menu-page {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: 20px 56px 24px;
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
