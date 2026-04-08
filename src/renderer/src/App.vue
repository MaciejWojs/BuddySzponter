<script setup lang="ts">
import { useSettingsStore } from '@renderer/stores/settingsStore'
import { useSocketStore } from '@renderer/stores/socketStore'

const toaster = { position: 'top-right', duration: 3000, dismissible: true, max: 3, expand: false }

const settingsStore = useSettingsStore()
settingsStore.initSettings()

const socketStore = useSocketStore()
socketStore.init()
</script>
<template>
  <UApp :toaster="toaster">
    <router-view></router-view>
  </UApp>
</template>
