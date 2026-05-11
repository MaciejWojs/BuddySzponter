<template>
  <div class="main-menu-nav">
    <header class="main-menu-nav__topbar">
      <NavBar :model-value="activeTab" :items="navItems" @update:model-value="onNavChange" />
    </header>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavBar from '@renderer/components/UI/NavBar.vue'
import type { NavBarItem } from '@renderer/components/UI/NavBar.vue'
import DevicesButton from '@renderer/components/simpleComponents/DevicesButton.vue'
import HomeButton from '@renderer/components/simpleComponents/HomeButton.vue'
import SettingButton from '@renderer/components/simpleComponents/SettingButton.vue'

const route = useRoute()
const router = useRouter()

const navItems: NavBarItem[] = [
  { name: 'settings', component: SettingButton },
  { name: 'home', component: HomeButton },
  { name: 'devices', component: DevicesButton }
]

const activeTab = computed(() => {
  const path = route.path.replace(/\/$/, '') || '/'
  if (path === '/settings') return 'settings'
  if (path === '/devices') return 'devices'
  return 'home'
})

const onNavChange = (name: string): void => {
  if (name === 'settings') {
    void router.push('/settings')
    return
  }
  if (name === 'devices') {
    void router.push('/devices')
    return
  }
  void router.push('/')
}
</script>

<style scoped>
.main-menu-nav {
  width: 100%;
}

.main-menu-nav__topbar {
  display: flex;
  justify-content: center;
  padding-top: 0;
}

.main-menu-nav__topbar :deep(button) {
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

.main-menu-nav__topbar :deep(svg) {
  width: 70%;
  height: 70%;
  max-width: 70%;
  max-height: 70%;
  object-fit: contain;
  display: block;
  margin: auto;
}

@media (max-width: 600px) {
  .main-menu-nav__topbar :deep(button) {
    min-width: 44px;
    min-height: 44px;
    border-radius: 10px;
    font-size: 16px;
  }
}
</style>
