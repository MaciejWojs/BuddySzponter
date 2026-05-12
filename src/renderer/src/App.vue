<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'

import { useSettingsStore } from '@renderer/stores/settingsStore'
import { useUserStore } from './stores/userStore'
import { useSocketStore } from '@renderer/stores/socketStore'
import { useDeviceStore } from './stores/deviceStore'
import { useAudioMixer } from './services/audio/out/useAudioMixer'
import { useWebRtcStore } from './stores/webRtcStore'
import { useConnectionStore } from './stores/connectionStore'

import { useGuestSync } from '@renderer/composables/syncWindow/useGuestSync'
import { useWidgetSync } from './composables/syncWindow/useWidgetSync'
import { useHostChatPortalSync } from '@renderer/composables/syncWindow/useHostChatPortalSync'
import { useCaptureStore } from '@renderer/stores/captureStore'
import { isVideoQualityPreset } from '@shared/schemas/appPreferences'
import { applyDocumentTheme } from '@renderer/utils/themeDocument'
import GuestFixedSessionToast from '@renderer/components/toasts/GuestFixedSessionToast.vue'

/** Viewport w portalu do body; wysoki z-index żeby był nad UserIcon / dropdownami (do ~2000). */
const toaster = {
  position: 'bottom-right' as const,
  duration: 5000,
  dismissible: true,
  max: 5,
  expand: true,
  class: 'pointer-events-auto !z-[22000]'
}

const webRtcStore = useWebRtcStore()
const connectionStore = useConnectionStore()
const settingsStore = useSettingsStore()
const socketStore = useSocketStore()
const userStore = useUserStore()
const deviceStore = useDeviceStore()

// Ustawienia i stan inicjalizujemy w zależności od typu okna
const isHostChatWindow = window.location.hash.includes('host-chat')
const isMainWindow =
  !window.location.hash.includes('guest') &&
  !window.location.hash.includes('widget') &&
  !window.location.hash.includes('tray-menu') &&
  !isHostChatWindow

if (isMainWindow) {
  void (async (): Promise<void> => {
    try {
      const prefs = await window.api.app.getAppPreferences()
      applyDocumentTheme(prefs.theme)
      const captureStore = useCaptureStore()
      if (isVideoQualityPreset(prefs.videoQualityPreset)) {
        captureStore.activeVideoQuality = prefs.videoQualityPreset
      }
    } catch {
      applyDocumentTheme('dark')
    }
  })()

  settingsStore.initSettings()
  socketStore.init()
  userStore.initSession()
  deviceStore.refreshMicrophones()
  useAudioMixer()
  useWidgetSync()
  useHostChatPortalSync('main')
} else if (window.location.hash.includes('guest')) {
  useGuestSync()
} else if (isHostChatWindow) {
  useHostChatPortalSync('portal')
}

onMounted(() => {
  if (isMainWindow) {
    // Opóźnienie zapobiegające wywołaniu API, zanim userStore zdąży zainicjować token (unikamy "Connection token missing")
    setTimeout(async () => {
      await connectionStore.restoreDefaultHost()
    }, 1000)
  }
})

const isRtcConnected = computed(() => webRtcStore.rtcStatus === 'connected')
const isHostConnected = computed(() => connectionStore.isHost && isRtcConnected.value)

const syncWindowMode = async (hostActive: boolean): Promise<void> => {
  try {
    if (hostActive) {
      await window.api.app.showHostWidget()
    } else {
      await window.api.app.hideHostWidget()
    }
  } catch (error) {
    console.warn('[SyncWindowMode] Nie udało się zsynchronizować widgetu:', error)
  }
}

if (isMainWindow) {
  watch(
    isHostConnected,
    (hostActive) => {
      void syncWindowMode(hostActive)
    },
    { immediate: true }
  )

  onUnmounted(() => {
    window.api.app.hideHostWidget().catch(() => {})
  })
}
</script>

<template>
  <UApp :toaster="toaster">
    <GuestFixedSessionToast />
    <WidgetControlListener>
      <router-view />
    </WidgetControlListener>
  </UApp>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
}

.app-shell.blurred {
  filter: blur(10px);
  pointer-events: none;
  user-select: none;
}

.session-loader {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.session-loader-spinner {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #d0f224;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.update-required-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(10, 10, 18, 0.6);
  backdrop-filter: blur(6px);
}

.update-required-card {
  width: min(560px, 100%);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(24, 24, 34, 0.96);
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.35);
  text-align: center;
}

.update-required-card h2 {
  margin: 0 0 12px;
  font-size: 1.5rem;
}

.update-required-card p {
  margin: 0;
  line-height: 1.5;
}

.status-line {
  margin-top: 14px;
  opacity: 0.8;
  font-size: 0.95rem;
}

.retry-button {
  margin-top: 16px;
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  font-weight: 600;
  cursor: pointer;
  color: #111827;
  background: #d0f224;
}
</style>
