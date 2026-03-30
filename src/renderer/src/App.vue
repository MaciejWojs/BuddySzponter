<script setup lang="ts">
import { useSettingsStore } from '@renderer/stores/settingsStore'
import Shared from './pages/shared.vue'

const toaster = { position: 'top-right', duration: 3000, dismissible: true, max: 3, expand: false }

const store = useSettingsStore()
store.initSettings()
</script>
<template>
  <UApp :toaster="toaster">
    <Shared />
  </UApp>
</template>
