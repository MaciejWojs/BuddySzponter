<template>
  <main
    class="host-widget"
    :class="{ 'is-lockout': isGuestLockedOut }"
    style="-webkit-app-region: drag"
  >
    <section class="status-wrap">
      <span class="status-dot" />
      <div class="status-text">
        <strong>Sesja hosta</strong>
        <small>{{
          isGuestLockedOut ? `Blokada gościa ${remainingTime.toFixed(1)}s` : 'Połączono'
        }}</small>
      </div>
    </section>

    <section class="actions" style="-webkit-app-region: no-drag">
      <button
        class="tool-btn"
        :class="state.controlGranted ? 'is-control-on' : 'is-control-off'"
        :title="state.controlGranted ? 'Zabierz kontrolę' : 'Oddaj kontrolę'"
        @click="sendCommand('TOGGLE_CONTROL')"
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

      <button
        class="tool-btn"
        :class="state.micActive ? 'is-active' : 'is-muted'"
        :title="state.micActive ? 'Wycisz mikrofon hosta' : 'Włącz mikrofon hosta'"
        @click="sendCommand('TOGGLE_MIC')"
      >
        <svg viewBox="0 0 24 24" class="icon">
          <path
            fill="currentColor"
            d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 1 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z"
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
        <svg viewBox="0 0 24 24" class="icon">
          <path
            fill="currentColor"
            d="M3 10v4h4l5 4V6L7 10H3Zm13.5 2a3.5 3.5 0 0 0-2.5-3.35v6.7A3.5 3.5 0 0 0 16.5 12ZM14 3.23v2.06A7 7 0 0 1 19 12a7 7 0 0 1-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77Z"
          />
        </svg>
      </button>

      <button class="tool-btn end-btn" title="Rozłącz sesję" @click="sendCommand('END_SESSION')">
        <svg viewBox="0 0 24 24" class="icon">
          <path
            fill="currentColor"
            d="M13 3h-2v10h2V3Zm-1 19a9 9 0 0 1-6.36-15.36l1.42 1.42A7 7 0 1 0 17 8.06l1.41-1.42A9 9 0 0 1 12 22Z"
          />
        </svg>
      </button>
    </section>

    <section v-if="isChatOpen" class="chat-panel" style="-webkit-app-region: no-drag">
      <header class="chat-header">
        <span>Rozmowa</span>
        <button type="button" class="chat-close" @click="isChatOpen = false">Zamknij</button>
      </header>

      <div class="chat-messages">
        <p v-if="chatMessages.length === 0" class="chat-empty">Brak wiadomości</p>
        <p v-for="(msg, index) in chatMessages" :key="`${index}-${msg}`" class="chat-line">
          {{ msg }}
        </p>
      </div>

      <form class="chat-form" @submit.prevent="sendChatMessage">
        <input
          ref="chatInputRef"
          v-model="chatInput"
          type="text"
          class="chat-input"
          placeholder="Napisz wiadomość..."
        />
        <button type="submit" class="chat-send">Wyślij</button>
      </form>
    </section>

    <div v-if="isGuestLockedOut" class="lockout-progress">
      <div class="lockout-fill" :style="{ width: `${lockoutProgress}%` }" />
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useChatChannel } from '@renderer/composables/channels/ChatChannel'

type WidgetCommand =
  | 'REQUEST_STATE'
  | 'TOGGLE_MIC'
  | 'TOGGLE_SYSTEM'
  | 'TOGGLE_CONTROL'
  | 'END_SESSION'

const state = ref({
  micActive: true,
  sysActive: true,
  controlGranted: false
})

const isChatOpen = ref(false)
const chatInput = ref('')
const chatInputRef = ref<HTMLInputElement | null>(null)

const chatChannel = useChatChannel()
const chatMessages = computed(() => chatChannel.chatMessages.value)

const LOCKOUT_DURATION_MS = 3000
const isGuestLockedOut = ref(false)
const lockoutUntil = ref(0)
const currentTime = ref(Date.now())
let timerInterval: ReturnType<typeof setInterval> | null = null
let syncChannel: BroadcastChannel | null = null

const remainingTime = computed(() => {
  if (!isGuestLockedOut.value) return 0
  return Math.max(0, (lockoutUntil.value - currentTime.value) / 1000)
})

const lockoutProgress = computed(() => {
  const current = lockoutUntil.value - currentTime.value
  return Math.min(100, Math.max(0, (current / LOCKOUT_DURATION_MS) * 100))
})

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

const toggleChat = (): void => {
  isChatOpen.value = !isChatOpen.value
  if (isChatOpen.value) {
    void nextTick(() => chatInputRef.value?.focus())
  }
}

const sendChatMessage = (): void => {
  const text = chatInput.value.trim()
  if (!text) return

  chatChannel.sendChatMessage(text, 'Host')
  chatInput.value = ''
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
  width: 500px;
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
  box-shadow:
    0 10px 28px rgba(14, 8, 30, 0.55),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  overflow: visible;
  color: #f6f2ff;
  user-select: none;
}

.host-widget.is-lockout {
  border-color: rgba(255, 173, 69, 0.9);
}

.status-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #6efe7f;
  box-shadow: 0 0 8px rgba(110, 254, 127, 0.9);
}

.status-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.status-text strong {
  font-size: 11px;
  font-weight: 700;
}

.status-text small {
  font-size: 9px;
  color: rgba(239, 231, 255, 0.78);
}

.actions {
  display: flex;
  align-items: center;
  gap: 5px;
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
  border-color: rgba(95, 241, 154, 0.7);
  color: #5ff19a;
  background: rgba(95, 241, 154, 0.14);
}

.is-control-off {
  border-color: rgba(255, 175, 77, 0.75);
  color: #ffaf4d;
  background: rgba(255, 175, 77, 0.12);
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
}

.chat-panel {
  position: absolute;
  top: 66px;
  right: 0;
  width: 320px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: linear-gradient(180deg, rgba(30, 22, 50, 0.97), rgba(20, 13, 36, 0.97));
  box-shadow: 0 18px 32px rgba(7, 5, 15, 0.5);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: pop-in 0.18s ease-out;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
}

.chat-close {
  border: none;
  background: transparent;
  color: #c8b8ee;
  font-size: 11px;
}

.chat-messages {
  height: 130px;
  overflow-y: auto;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 8px;
}

.chat-empty {
  font-size: 11px;
  color: rgba(224, 214, 255, 0.6);
}

.chat-line {
  margin: 0 0 4px;
  font-size: 11px;
  color: #ece5ff;
  word-break: break-word;
}

.chat-form {
  display: flex;
  gap: 6px;
}

.chat-input {
  flex: 1;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 0 8px;
  font-size: 12px;
}

.chat-input:focus {
  outline: none;
  border-color: rgba(124, 228, 255, 0.9);
}

.chat-send {
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(124, 228, 255, 0.65);
  background: rgba(124, 228, 255, 0.18);
  color: #dff8ff;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
}

.lockout-progress {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 5px;
  height: 2px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.2);
}

.lockout-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ffcf5c 0%, #ff7b4e 100%);
  transition: width 75ms linear;
}

@keyframes pop-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
