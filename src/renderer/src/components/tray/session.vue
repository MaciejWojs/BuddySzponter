<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  isMicMuted: boolean
}>()

let syncChannel: BroadcastChannel | null = null

onMounted(() => {
  syncChannel = new BroadcastChannel('guest-sync-channel')
})

onUnmounted(() => {
  if (syncChannel) syncChannel.close()
})

const handleOpenApp = async (): Promise<void> => {
  await window.api.app.showApp()
}

const handleToggleMic = (): void => {
  syncChannel?.postMessage({ type: 'COMMAND_TOGGLE_MIC', payload: !props.isMicMuted })
}

const handleStopSession = (): void => {
  syncChannel?.postMessage({ type: 'COMMAND_DISCONNECT' })
}

const handleQuit = async (): Promise<void> => {
  await window.api.app.quitApp()
}
</script>

<template>
  <main>
    <header>
      <h1>Host Menu</h1>
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
html {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
}

body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background: transparent !important;
  overflow: hidden;
  user-select: none;
}

#app {
  width: 100%;
  height: 100%;
}

main {
  width: 100%;
  height: 100%;
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

header {
  margin-bottom: 20px;
}

header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
}

section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

button {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  background: rgba(208, 242, 36, 0.2);
  color: #d0f224;
  transition: background 0.2s;
}

button:hover {
  background: rgba(208, 242, 36, 0.3);
}

button:active {
  background: rgba(208, 242, 36, 0.4);
}
</style>
