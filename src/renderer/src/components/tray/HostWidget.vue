<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useSocketStore } from '@renderer/stores/socketStore'
import { useHidChannel } from '@renderer/composables/channels/HidChannel'

const isMuted = ref<boolean>(false)
const hasUnread = ref<boolean>(true)
const isGuestLockedOut = ref<boolean>(false)

type ApiWithInvoke = typeof window.api & {
  invoke?: (channel: string, ...args: unknown[]) => Promise<unknown>
}

const apiWithInvoke = window.api as ApiWithInvoke

const handleHostLockout = (_event: unknown, isLockedOut: boolean): void => {
  isGuestLockedOut.value = Boolean(isLockedOut)
}

const invokeAction = async (channel: string, payload?: unknown): Promise<void> => {
  if (typeof apiWithInvoke.invoke === 'function') {
    await apiWithInvoke.invoke(channel, payload)
  }
}

const toggleMute = async (): Promise<void> => {
  isMuted.value = !isMuted.value
  await invokeAction('widget:toggle-mute', { muted: isMuted.value })
}

const toggleChat = async (): Promise<void> => {
  hasUnread.value = false
  await invokeAction('widget:toggle-chat')
}

const endSession = async (): Promise<void> => {
  await invokeAction('widget:end-session')
  useSocketStore().disconnect()
  window.electron.ipcRenderer.send('widget-close-session')
}

const hid = useHidChannel()
const giveControl = (): void => {
  hid.grantControl()
}

onMounted(() => {
  window.electron.ipcRenderer.on('input:host-lockout', handleHostLockout)
})

onUnmounted(() => {
  window.electron.ipcRenderer.removeListener('input:host-lockout', handleHostLockout)
})
</script>

<template>
  <main class="widget-shell">
    <section class="left-group">
      <div class="drag-handle" aria-hidden="true" title="Przeciagnij widget">
        <svg viewBox="0 0 20 20" class="icon-drag">
          <circle cx="5" cy="5" r="1.2" />
          <circle cx="10" cy="5" r="1.2" />
          <circle cx="15" cy="5" r="1.2" />
          <circle cx="5" cy="10" r="1.2" />
          <circle cx="10" cy="10" r="1.2" />
          <circle cx="15" cy="10" r="1.2" />
        </svg>
      </div>

      <div v-if="isGuestLockedOut" class="lockout-indicator" title="Host Priority aktywne">
        <svg viewBox="0 0 24 24" class="icon-lock">
          <path
            d="M7 10V8a5 5 0 1 1 10 0v2m-9 0h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </section>

    <section class="center-group">
      <button
        class="tool-btn"
        :class="isMuted ? 'muted' : 'idle'"
        type="button"
        title="Mikrofon"
        @click="toggleMute"
      >
        <svg v-if="!isMuted" viewBox="0 0 24 24" class="icon">
          <path
            d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Zm-7 8a1 1 0 1 1 2 0 5 5 0 0 0 10 0 1 1 0 1 1 2 0 7 7 0 0 1-6 6.93V21h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-3.07A7 7 0 0 1 5 11Z"
            fill="currentColor"
          />
        </svg>
        <svg v-else viewBox="0 0 24 24" class="icon">
          <path
            d="M4.2 3.1a1 1 0 0 0-1.4 1.4l16 16a1 1 0 1 0 1.4-1.4L4.2 3.1Zm7.8-.1a3 3 0 0 1 3 3v4.2l-6-6.1V6a3 3 0 0 1 3-3Zm-5 8a1 1 0 0 0-2 0 7 7 0 0 0 7 7c1.2 0 2.4-.3 3.4-.9l-1.5-1.5a4.8 4.8 0 0 1-1.9.4 5 5 0 0 1-5-5Zm11.9 0c0 .8-.2 1.6-.6 2.3l1.5 1.5a7 7 0 0 0 1.1-3.8 1 1 0 1 0-2 0ZM11 21h2v-2.1l-2-2V21Zm-2 2h6a1 1 0 1 0 0-2H9a1 1 0 1 0 0 2Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <button class="tool-btn idle" type="button" title="Oddaj kontrolę" @click="giveControl">
        <svg viewBox="0 0 24 24" class="icon">
          <path
            d="M12 2a5 5 0 0 1 5 5v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v3h6V7a3 3 0 0 0-3-3Zm-4 8v8h12v-8H8Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <button class="tool-btn idle chat-btn" type="button" title="Czat" @click="toggleChat">
        <svg viewBox="0 0 24 24" class="icon">
          <path
            d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4.2 3.3A1 1 0 0 1 3 19.5V6a2 2 0 0 1 2-2Z"
            fill="currentColor"
          />
        </svg>
        <span v-if="hasUnread" class="badge" aria-hidden="true"></span>
      </button>
    </section>

    <section class="right-group">
      <button class="end-btn" type="button" title="Zakoncz sesje" @click="endSession">
        <svg viewBox="0 0 24 24" class="icon-end">
          <path
            d="M21 15.5c0 .4-.2.8-.6 1.1l-1.7 1.4a1.3 1.3 0 0 1-1.6 0l-2.4-2a1.3 1.3 0 0 1-.4-1.5l.6-1.3a12.3 12.3 0 0 0-5.8 0l.6 1.3a1.3 1.3 0 0 1-.4 1.5l-2.4 2a1.3 1.3 0 0 1-1.6 0L3.6 16.6a1.3 1.3 0 0 1-.6-1.1c0-3 4.1-5.5 9-5.5s9 2.5 9 5.5Z"
            fill="currentColor"
          />
        </svg>
        <span>Zakoncz</span>
      </button>
    </section>
  </main>
</template>

<style scoped>
.widget-shell {
  width: 300px;
  height: 60px;
  box-sizing: border-box;
  padding: 8px 10px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(30, 30, 30, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #e8e8e8;
  -webkit-app-region: drag;
  user-select: none;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35);
}

.left-group,
.center-group,
.right-group {
  display: flex;
  align-items: center;
}

.left-group {
  gap: 8px;
  min-width: 58px;
}

.center-group {
  gap: 8px;
  /* Zwiększ odstęp na dodatkowy przycisk */
  gap: 12px;
}

.drag-handle {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  color: rgba(235, 235, 235, 0.55);
}

.icon-drag {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.lockout-indicator {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  color: #ffcb5f;
}

.icon-lock {
  width: 16px;
  height: 16px;
}

button {
  -webkit-app-region: no-drag;
}

.tool-btn {
  position: relative;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.05);
  color: #ececec;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.tool-btn:hover {
  background: rgba(255, 255, 255, 0.11);
  border-color: rgba(255, 255, 255, 0.26);
}

.tool-btn.muted {
  color: #ff9f87;
  border-color: rgba(255, 102, 102, 0.4);
  background: rgba(126, 40, 40, 0.35);
}

.icon {
  width: 17px;
  height: 17px;
}

.chat-btn .badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ff4d4f;
  box-shadow: 0 0 0 2px rgba(30, 30, 30, 0.85);
}

.end-btn {
  height: 34px;
  padding: 0 11px;
  border: 1px solid rgba(255, 103, 103, 0.5);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(209, 61, 61, 0.95), rgba(168, 38, 38, 0.95));
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition:
    filter 0.15s ease,
    transform 0.1s ease;
}

.end-btn:hover {
  filter: brightness(1.08);
}

.end-btn:active {
  transform: translateY(1px);
}

.icon-end {
  width: 14px;
  height: 14px;
}
</style>
