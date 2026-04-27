<template>
  <main
    class="host-widget"
    :class="{ 'is-lockout': isAnyGuestLockout }"
    style="-webkit-app-region: drag"
  >
    <section class="actions" style="-webkit-app-region: no-drag">
      <div class="connection-meter" :title="`Jakość połączenia: ${connectionLabel}`">
        <span class="meter-dot" :class="`is-${connectionStatusClass}`" />
        <div class="meter-bars" aria-hidden="true">
          <span class="meter-bar" :class="{ active: state.connectionBars >= 1 }" />
          <span class="meter-bar" :class="{ active: state.connectionBars >= 2 }" />
          <span class="meter-bar" :class="{ active: state.connectionBars >= 3 }" />
        </div>
      </div>

      <div class="action-group">
        <button
          class="tool-btn"
          :class="[
            state.controlGranted ? 'is-control-on' : 'is-control-off',
            isManualGuestLock ? 'is-lock-toggle-on' : ''
          ]"
          :title="isManualGuestLock ? 'Blokada goscia aktywna' : 'Kliknij, aby zablokowac goscia'"
          @click="toggleGuestLock"
        >
          <svg viewBox="0 0 24 24" class="icon">
            <path
              fill="currentColor"
              d="M18 8h-1V6a5 5 0 1 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2Zm-9-2a3 3 0 0 1 6 0v2H9V6Zm3 11a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"
            />
          </svg>
        </button>

        <button
          class="tool-btn"
          :class="isChatOpen ? 'is-chat-on' : ''"
          title="Rozwiń czat"
          @click="toggleChat"
        >
          <svg viewBox="0 0 24 24" class="icon">
            <path
              fill="currentColor"
              d="M12 3C7.03 3 3 6.58 3 11c0 2.13.96 4.07 2.53 5.5V21l4.23-2.31c.74.2 1.52.31 2.24.31 4.97 0 9-3.58 9-8s-4.03-8-9-8Zm-4 9h8a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2Zm8-3H8a1 1 0 1 1 0-2h8a1 1 0 1 1 0 2Z"
            />
          </svg>
        </button>
      </div>

      <div class="action-group">
        <button
          class="tool-btn"
          :class="state.micActive ? 'is-active' : 'is-muted'"
          :title="state.micActive ? 'Wycisz mikrofon hosta' : 'Włącz mikrofon hosta'"
          @click="sendCommand('TOGGLE_MIC')"
        >
          <svg v-if="state.micActive" viewBox="0 0 24 24" class="icon">
            <path
              fill="currentColor"
              d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 1 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z"
            />
          </svg>
          <svg v-else viewBox="0 0 24 24" class="icon">
            <path
              fill="currentColor"
              d="M19 11h-1.7a5.5 5.5 0 0 1-1.31 3.56l-1.43-1.43A3.5 3.5 0 0 0 15 11V6a3 3 0 0 0-5.14-2.12L8.43 2.45A5 5 0 0 1 17 6v5ZM3.27 2 2 3.27l7 7V11a3 3 0 0 0 4.85 2.35l1.48 1.48A4.97 4.97 0 0 1 13 15.9V21h-2v-5.1A7 7 0 0 1 5 11H3.3a8.7 8.7 0 0 0 7.7 6.85V21h2v-3.16a8.3 8.3 0 0 0 3.73-1.46L20.73 21 22 19.73 3.27 2Z"
            />
          </svg>
        </button>

        <button
          class="tool-btn"
          :class="state.sysActive ? 'is-active' : 'is-muted'"
          :title="
            state.sysActive ? 'Wycisz dźwięki systemowe hosta' : 'Włącz dźwięki systemowe hosta'
          "
          @click="sendCommand('TOGGLE_SYSTEM')"
        >
          <svg v-if="state.sysActive" viewBox="0 0 24 24" class="icon">
            <path
              fill="currentColor"
              d="M3 10v4h4l5 4V6L7 10H3Zm13.5 2a3.5 3.5 0 0 0-2.5-3.35v6.7A3.5 3.5 0 0 0 16.5 12ZM14 3.23v2.06A7 7 0 0 1 19 12a7 7 0 0 1-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77Z"
            />
          </svg>
          <svg v-else viewBox="0 0 24 24" class="icon">
            <path
              fill="currentColor"
              d="M3 10v4h4l5 4V6L7 10H3Zm10.33 2a3.5 3.5 0 0 0-.81-2.24l1.45-1.46A5.47 5.47 0 0 1 15.33 12c0 1.28-.44 2.45-1.18 3.37l-1.45-1.45c.39-.53.63-1.18.63-1.92ZM14 3.23v2.06c1.02.3 1.95.78 2.74 1.41l-1.42 1.42A4.93 4.93 0 0 0 14 7.35v3.03l-2-2V3.23h2ZM2 3.27 3.27 2 22 20.73 20.73 22l-3.88-3.88A8.85 8.85 0 0 1 14 20.77v-2.06a6.91 6.91 0 0 0 1.43-.54l-3.05-3.05L12 14.77V20l-5-4H3v-4h4l3.14-2.51L2 3.27Z"
            />
          </svg>
        </button>
      </div>

      <button class="tool-btn end-btn" title="Rozłącz sesję" @click="sendCommand('END_SESSION')">
        <svg viewBox="0 0 24 24" class="icon">
          <path
            fill="currentColor"
            d="M1 10.5c0 0 1.34-1.34 2.5-2C4.66 7.84 7.34 7 12 7s7.34.84 8.5 1.5c1.16.66 2.5 2 2.5 2l-4 4-3-3V10H8v1.5l-3 3-4-4Z"
          />
        </svg>
      </button>
    </section>

    <div v-if="isGuestLockedOut && !isManualGuestLock" class="lockout-progress">
      <div class="lockout-fill" :style="{ width: `${lockoutProgress}%` }" />
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

type WidgetCommand =
  | 'REQUEST_STATE'
  | 'TOGGLE_MIC'
  | 'TOGGLE_SYSTEM'
  | 'TOGGLE_CONTROL'
  | 'END_SESSION'

const state = ref({
  micActive: true,
  sysActive: true,
  controlGranted: false,
  connectionBars: 0
})

const isChatOpen = ref(false)
const isManualGuestLock = ref(false)

const LOCKOUT_DURATION_MS = 3000
const isGuestLockedOut = ref(false)
const lockoutUntil = ref(0)
const currentTime = ref(Date.now())
let timerInterval: ReturnType<typeof setInterval> | null = null
let syncChannel: BroadcastChannel | null = null

const lockoutProgress = computed(() => {
  const current = lockoutUntil.value - currentTime.value
  return Math.min(100, Math.max(0, (current / LOCKOUT_DURATION_MS) * 100))
})

const connectionLabel = computed(() => {
  if (state.value.connectionBars >= 3) return 'dobre'
  if (state.value.connectionBars >= 2) return 'średnie'
  if (state.value.connectionBars >= 1) return 'słabe'
  return 'brak'
})

const connectionStatusClass = computed(() => {
  if (state.value.connectionBars >= 3) return 'good'
  if (state.value.connectionBars >= 2) return 'fair'
  if (state.value.connectionBars >= 1) return 'poor'
  return 'off'
})

const isAnyGuestLockout = computed(() => isGuestLockedOut.value || isManualGuestLock.value)

const stopTimer = (): void => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

const handleHostLockout = (_event, data: { active: boolean; until: number }): void => {
  isGuestLockedOut.value = data.active
  lockoutUntil.value = data.until

  if (data.active && !timerInterval) {
    timerInterval = setInterval(() => {
      currentTime.value = Date.now()
      if (currentTime.value >= lockoutUntil.value) stopTimer()
    }, 50)
  }

  if (!data.active) stopTimer()
}

const toggleChat = async (): Promise<void> => {
  try {
    isChatOpen.value = await window.api.app.toggleHostWidgetChat()
    syncChannel?.postMessage({ type: 'CHAT_VISIBILITY', open: isChatOpen.value })
  } catch (error) {
    console.error('Nie udało się przełączyć okna czatu widgetu:', error)
  }
}

const toggleGuestLock = (): void => {
  isManualGuestLock.value = !isManualGuestLock.value
  sendCommand('TOGGLE_CONTROL')
}

const sendCommand = (actionType: WidgetCommand): void => {
  if (syncChannel) syncChannel.postMessage({ type: actionType })
}

onMounted(() => {
  syncChannel = new BroadcastChannel('widget-sync-channel')

  syncChannel.onmessage = (event) => {
    if (event.data.type === 'STATE_UPDATE') {
      state.value = { ...state.value, ...event.data.payload }
    }

    if (event.data.type === 'CHAT_VISIBILITY') {
      isChatOpen.value = Boolean(event.data.open)
    }
  }

  syncChannel.postMessage({ type: 'REQUEST_STATE' })
  window.electron.ipcRenderer.on('input:host-lockout', handleHostLockout)
})

onUnmounted(() => {
  stopTimer()
  if (syncChannel) syncChannel.close()
  window.electron.ipcRenderer.removeListener('input:host-lockout', handleHostLockout)
})
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

.host-widget {
  position: relative;
  width: 440px;
  height: 60px;
  box-sizing: border-box;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background:
    radial-gradient(circle at 18% 10%, rgba(166, 114, 255, 0.45), transparent 52%),
    linear-gradient(
      90deg,
      rgba(35, 20, 56, 0.96) 0%,
      rgba(90, 52, 158, 0.94) 56%,
      rgba(46, 29, 83, 0.96) 100%
    );
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  overflow: visible;
  color: #f6f2ff;
  user-select: none;
}

.host-widget.is-lockout {
  border-color: rgba(255, 255, 255, 0.92);
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.connection-meter {
  display: flex;
  align-items: flex-end;
  gap: 5px;
  padding: 0 6px 0 2px;
}

.meter-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.35);
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.25);
}

.meter-dot.is-good {
  background: #57f0a3;
  box-shadow: 0 0 8px rgba(87, 240, 163, 0.5);
}

.meter-dot.is-fair {
  background: #ffd66b;
  box-shadow: 0 0 8px rgba(255, 214, 107, 0.45);
}

.meter-dot.is-poor {
  background: #ff8e8e;
  box-shadow: 0 0 8px rgba(255, 142, 142, 0.45);
}

.meter-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}

.meter-bar {
  width: 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.22);
}

.meter-bar:nth-child(1) {
  height: 6px;
}

.meter-bar:nth-child(2) {
  height: 9px;
}

.meter-bar:nth-child(3) {
  height: 12px;
}

.meter-bar.active {
  background: #f6f2ff;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.tool-btn {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.08);
  color: #e9dcff;
  display: grid;
  place-items: center;
  transition:
    transform 0.14s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;
}

.tool-btn:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.16);
}

.tool-btn:active {
  transform: scale(0.95);
}

.icon {
  width: 15px;
  height: 15px;
}

.is-control-on {
  border-color: rgba(255, 255, 255, 0.92);
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
  animation: control-pulse 1.3s ease-in-out infinite;
}

.is-control-off {
  border-color: rgba(255, 255, 255, 0.45);
  color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.06);
}

.is-lock-toggle-on {
  border-color: rgba(255, 85, 115, 0.92);
  background: rgba(255, 85, 115, 0.2);
  color: #ff8ca6;
}

.is-chat-on {
  border-color: rgba(120, 230, 255, 0.72);
  color: #78e6ff;
  background: rgba(120, 230, 255, 0.16);
}

.is-active {
  color: #d7cbff;
}

.is-muted {
  border-color: rgba(255, 110, 155, 0.75);
  color: #ff6e9b;
  background: rgba(255, 110, 155, 0.12);
}

.end-btn {
  border-color: rgba(255, 110, 110, 0.75);
  color: #ff7c7c;
  background: rgba(255, 107, 107, 0.15);
  margin-left: 2px;
}

.lockout-progress {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 5px;
  height: 2px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.35);
}

.lockout-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ffffff 0%, #f1f1f1 100%);
  transition: width 75ms linear;
}

@keyframes control-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.35);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(255, 255, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
  }
}
</style>
