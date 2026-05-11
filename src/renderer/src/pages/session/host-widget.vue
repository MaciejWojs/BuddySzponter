<template>
  <div class="w-full h-full relative" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
    <HostWidgetNormal
      v-if="widgetMode === 'normal'"
      :state="state"
      :guest-name="guestName"
      @send-command="sendCommand"
      @go-to-next-monitor="goToNextMonitor"
      @set-widget-mode="setWidgetMode"
      @toggle-chat="toggleChat"
    />

    <HostWidgetCompact
      v-else-if="widgetMode === 'compact' || widgetMode === 'peek'"
      :widget-mode="widgetMode"
      @set-widget-mode="setWidgetMode"
    />

    <HostWidgetHidden v-else-if="widgetMode === 'hidden'" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const guestName = ref<string>('')

const state = ref({
  micActive: true,
  sysActive: true,
  guestMicActive: true,
  controlGranted: false,
  clipboardSyncEnabled: false,
  chatHasUnread: false
})

let syncChannel: BroadcastChannel | null = null

const widgetMode = ref<'normal' | 'compact' | 'hidden' | 'peek'>('normal')

onMounted(() => {
  syncChannel = new BroadcastChannel('widget-sync-channel')

  syncChannel.onmessage = (event) => {
    if (event.data.type === 'STATE_UPDATE') {
      const { guestName: name, ...rest } = event.data.payload ?? {}
      if (name !== undefined) guestName.value = name
      state.value = { ...state.value, ...rest }
    }
  }

  syncChannel.postMessage({ type: 'REQUEST_STATE' })
})

onUnmounted(() => {
  if (syncChannel) syncChannel.close()
})

const goToNextMonitor = async (): Promise<void> => {
  if (typeof window.screenCapture?.nextMonitor === 'function') {
    await window.screenCapture.nextMonitor()
    return
  }

  if (typeof window.capture?.nextMonitor === 'function') {
    await window.capture.nextMonitor()
    return
  }

  sendCommand('NEXT_MONITOR')
}

const sendCommand = (actionType: string, payload?: unknown): void => {
  if (syncChannel) syncChannel.postMessage({ type: actionType, payload })
}

const setWidgetMode = (mode: 'normal' | 'compact' | 'hidden' | 'peek'): void => {
  widgetMode.value = mode
  sendCommand('SET_WIDGET_MODE', mode)
}

const toggleChat = async (): Promise<void> => {
  if (window.api?.app?.showHostChatWindow) {
    await window.api.app.showHostChatWindow().catch(() => undefined)
  }
}

let leaveTimeout: ReturnType<typeof setTimeout> | null = null

const onMouseEnter = (): void => {
  if (leaveTimeout) {
    clearTimeout(leaveTimeout)
    leaveTimeout = null
  }
  if (widgetMode.value === 'hidden') {
    setWidgetMode('peek')
  }
}

const onMouseLeave = (): void => {
  leaveTimeout = setTimeout(() => {
    if (widgetMode.value === 'peek') {
      setWidgetMode('hidden')
    }
  }, 200)
}
</script>

<style scoped>
:global(html),
:global(body),
:global(#app) {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background: transparent;
  overflow: hidden;
}
</style>
