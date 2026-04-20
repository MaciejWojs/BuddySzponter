<script setup lang="ts">
import { ref } from 'vue'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { useSessionStore } from '@renderer/stores/sessionStore'

const webRtcStore = useWebRtcStore()
const isMicMuted = ref(false)

const handleOpenApp = async (): Promise<void> => {
  await window.api.app.showApp()
}

const handleToggleMic = (): void => {
  isMicMuted.value = !isMicMuted.value
  useSessionStore().toggleMicrophone(isMicMuted.value)
}

const handleStopSession = (): void => {
  webRtcStore.forceDisconnect()
}

const handleQuit = async (): Promise<void> => {
  await window.api.app.quitApp()
}
</script>

<template>
  <main>
    <header>
      <h1>Guest Menu</h1>
    </header>

    <section>
      <button type="button" @click="handleOpenApp">Open App</button>
      <button type="button" @click="handleToggleMic">
        {{ isMicMuted ? 'Unmute Mic' : 'Mute Mic' }}
      </button>
      <button type="button" @click="handleStopSession">Stop Session</button>
      <button type="button" @click="handleQuit">Quit</button>
    </section>
  </main>
</template>

<style>
html,
body,
#app {
  background: transparent !important;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  user-select: none;
}

main {
  width: calc(100% - 16px);
  height: calc(100% - 16px);
  margin: 8px;

  background: rgba(25, 25, 28, 0.85);

  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  border-radius: 16px;

  border: 1px solid rgba(255, 255, 255, 0.1);

  overflow: hidden;

  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
</style>
