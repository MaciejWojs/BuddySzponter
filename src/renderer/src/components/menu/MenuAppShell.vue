<template>
  <section class="menu-page">
    <UserIcon v-if="isAuthenticated" />
    <UserNoLogin v-else />

    <MainMenuNavBar />

    <div class="menu-app-shell__main">
      <slot />
    </div>

    <footer class="menu-footer">
      <img :src="buddySzponterLogo" :alt="$t('common.logoAlt')" class="menu-logo" />
    </footer>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUserStore } from '@renderer/stores/userStore'
import buddySzponterLogo from '@images/buddyszponterLogo.png'
import MainMenuNavBar from '@renderer/components/menu/MainMenuNavBar.vue'
import UserIcon from '@renderer/components/simpleComponents/UserIcon.vue'
import UserNoLogin from '@renderer/components/simpleComponents/UserNoLogin.vue'

const userStore = useUserStore()
const { isAuthenticated } = storeToRefs(userStore)
</script>

<style scoped>
.menu-lang-selector {
  position: absolute;
  top: 20px;
  left: 24px;
  z-index: 10;
}

.menu-page {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  padding: 20px 56px 24px;
  position: relative;
}

.menu-app-shell__main {
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
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

  .menu-footer {
    margin-top: 6px;
  }

  .menu-logo {
    width: 80px;
  }
}
</style>
