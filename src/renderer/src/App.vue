<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@renderer/stores/settingsStore'
import { useUserStore } from './stores/userStore'
import { useSocketStore } from '@renderer/stores/socketStore'
import { useDeviceStore } from './stores/deviceStore'
import { useAudioMixer } from './services/audio/out/useAudioMixer'
import WidgetControlListener from '@renderer/components/p2p/WidgetControlListener.vue'
import { useWebRtcStore } from './stores/webRtcStore'
import { useConnectionStore } from './stores/connectionStore'
import { useWidgetBridge } from '@renderer/composables/useWidgetSync'

const toaster = { position: 'top-left', duration: 3000, dismissible: true, max: 3, expand: false }

const router = useRouter()
const webRtcStore = useWebRtcStore()
const connectionStore = useConnectionStore()
const settingsStore = useSettingsStore()
const socketStore = useSocketStore()
const userStore = useUserStore()
const deviceStore = useDeviceStore()

settingsStore.initSettings()
socketStore.init()
userStore.initSession()
deviceStore.refreshMicrophones()
connectionStore.initHost()
useAudioMixer()
useWidgetBridge()

const isRtcConnected = computed(() => webRtcStore.rtcStatus === 'connected')
const isHostConnected = computed(() => connectionStore.isHost && isRtcConnected.value)
const isGuestConnected = computed(() => !connectionStore.isHost && isRtcConnected.value)

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

const previousRoute = ref('/api-test')

watch(
  isGuestConnected,
  (connected) => {
    if (connected) {
      if (!router.currentRoute.value.path.includes('/session/guest-view')) {
        previousRoute.value = router.currentRoute.value.fullPath
      }

      router.push('/session/guest-view')
    } else {
      if (router.currentRoute.value.path.includes('/session/guest-view')) {
        router.push(previousRoute.value)
      }
    }
  },
  { immediate: true }
)
</script>

<template>
  <UApp :toaster="toaster">
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
