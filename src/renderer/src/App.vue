<script setup lang="ts">
import { useSettingsStore } from '@renderer/stores/settingsStore'
import Menu from './pages/Menu.vue'

const toaster = { position: 'top-right', duration: 3000, dismissible: true, max: 3, expand: false }

const store = useSettingsStore()
store.initSettings()
</script>
<template>
  <UApp :toaster="toaster">
    <Menu />
  </UApp>
</template>
