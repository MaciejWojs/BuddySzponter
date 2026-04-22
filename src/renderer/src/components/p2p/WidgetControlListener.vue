<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useHidChannel } from '@renderer/composables/channels/HidChannel'

const hid = useHidChannel()

const handleWidgetToggleControl = (_event, payload: { granted: boolean }): void => {
  if (payload.granted) {
    hid.grantControl()
  } else {
    hid.revokeControl()
  }
}

onMounted(() => {
  window.electron.ipcRenderer.on('widget:toggle-control', handleWidgetToggleControl)
})

onUnmounted(() => {
  window.electron.ipcRenderer.removeAllListeners('widget:toggle-control')
})
</script>

<template>
  <slot />
</template>
