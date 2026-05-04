<template>
  <main
    class="w-[550px] h-[60px] px-4 bg-[#1e1e1e]/90 backdrop-blur-xl border border-[#333] shadow-2xl flex items-center justify-between text-[#e8e8e8] select-none overflow-hidden rounded-[16px]"
    style="-webkit-app-region: drag"
  >
    <div class="flex items-center gap-3">
      <div
        class="relative flex items-center justify-center w-8 h-8 bg-rose-500/10 rounded-full border border-rose-500/30"
      >
        <div
          class="w-3 h-3 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]"
        ></div>
      </div>
      <div class="flex flex-col">
        <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none"
          >Status</span
        >
        <span class="text-sm font-semibold text-rose-400 leading-tight">Udostępniasz</span>
      </div>
    </div>

    <div class="flex items-center gap-2" style="-webkit-app-region: no-drag">
      <button
        class="flex items-center justify-center w-10 h-10 rounded-lg transition-all border group"
        :class="
          state.micActive
            ? 'bg-[#2a2a2a] border-[#444] text-gray-200 hover:border-blue-500'
            : 'bg-rose-900/30 border-rose-700 text-rose-300'
        "
        :title="state.micActive ? 'Wycisz swój mikrofon' : 'Włącz mikrofon'"
        @click="sendCommand('TOGGLE_MIC')"
      >
        <span class="text-lg group-active:scale-90 transition-transform">{{
          state.micActive ? '🎙️' : '🎙️'
        }}</span>
      </button>

      <button
        class="flex items-center justify-center w-10 h-10 rounded-lg transition-all border group bg-[#2a2a2a] border-[#444] text-gray-200 hover:border-purple-500"
        title="Następny monitor"
        @click="goToNextMonitor"
      >
        <span class="text-lg group-active:scale-90 transition-transform">🖥️</span>
      </button>

      <button
        class="flex items-center justify-center w-10 h-10 rounded-lg transition-all border group"
        :class="
          state.sysActive
            ? 'bg-[#2a2a2a] border-[#444] text-gray-200 hover:border-emerald-500'
            : 'bg-rose-900/30 border-rose-700 text-rose-300'
        "
        :title="state.sysActive ? 'Wycisz dźwięk systemu' : 'Udostępniaj dźwięk systemu'"
        @click="sendCommand('TOGGLE_SYSTEM')"
      >
        <span class="text-lg group-active:scale-90 transition-transform">{{
          state.sysActive ? '🔊' : '🔇'
        }}</span>
      </button>

      <div class="w-px h-6 bg-[#444] mx-1"></div>

      <button
        class="flex items-center justify-center w-10 h-10 rounded-lg transition-all border group"
        :class="
          state.guestMicActive
            ? 'bg-[#2a2a2a] border-[#444] text-cyan-400 hover:border-cyan-500'
            : 'bg-[#202020] border-[#333] text-gray-600'
        "
        :title="state.guestMicActive ? 'Wycisz mikrofon gościa' : 'Odwiesz mikrofon gościa'"
        @click="sendCommand('TOGGLE_GUEST_MIC')"
      >
        <span class="text-lg group-active:scale-90 transition-transform">{{
          state.guestMicActive ? '🎧' : '🔕'
        }}</span>
      </button>

      <button
        class="flex items-center px-3 h-10 rounded-lg transition-all border group gap-2"
        :class="
          state.controlGranted
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
            : 'bg-[#2a2a2a] border-[#444] text-gray-400 hover:text-white'
        "
        :title="state.controlGranted ? 'Zabierz kontrolę' : 'Oddaj kontrolę myszy/klawiatury'"
        @click="sendCommand('TOGGLE_CONTROL')"
      >
        <span class="text-lg group-active:scale-90 transition-transform">{{
          state.controlGranted ? '🖱️' : '🔒'
        }}</span>
        <span class="text-xs font-bold">{{ state.controlGranted ? 'MYSZ ON' : 'MYSZ OFF' }}</span>
      </button>

      <button
        class="flex items-center justify-center px-3 h-10 ml-2 rounded-lg transition-all bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs tracking-wider border border-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.3)] active:scale-95"
        @click="sendCommand('END_SESSION')"
      >
        ZAKOŃCZ
      </button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const state = ref({
  micActive: true,
  sysActive: true,
  guestMicActive: true,
  controlGranted: false
})

let syncChannel: BroadcastChannel | null = null

onMounted(() => {
  syncChannel = new BroadcastChannel('widget-sync-channel')

  syncChannel.onmessage = (event) => {
    if (event.data.type === 'STATE_UPDATE') {
      state.value = { ...state.value, ...event.data.payload }
    }
  }

  // Po odpaleniu prosimy o stan z głównego okna
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

  // Fallback: jeśli widget opiera się tylko na kanale komunikacyjnym do wywołań
  sendCommand('NEXT_MONITOR')
}

const sendCommand = (actionType: string): void => {
  if (syncChannel) syncChannel.postMessage({ type: actionType })
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
