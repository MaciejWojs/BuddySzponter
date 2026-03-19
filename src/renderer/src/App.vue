<script setup lang="ts">
const toaster = { position: 'top-right', duration: 3000, dismissible: true, max: 3, expand: false }

import { useSettingsStore } from '@renderer/stores/settingsStore'

const store = useSettingsStore()
store.initLanguage()
</script>

<template>
  <UApp :toaster="toaster">
    <router-view></router-view>
  </UApp>
</template>
