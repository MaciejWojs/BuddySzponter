<template>
  <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5 col-span-1 md:col-span-2">
    <header class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold m-0">Test DataChannel P2P</h2>

      <div class="flex items-center gap-3">
        <span
          class="px-3 py-1 rounded bg-black border border-[#444] text-xs font-mono"
          :class="webRtcStore.rtcStatus === 'connected' ? 'text-emerald-400' : 'text-gray-400'"
        >
          {{ webRtcStore.rtcStatus.toUpperCase() }}
        </span>

        <button
          v-if="webRtcStore.rtcStatus === 'connected'"
          class="px-3 py-1 bg-rose-600/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500 hover:text-white rounded text-xs font-bold transition-colors cursor-pointer"
          @click="webRtcStore.disconnect()"
        >
          Rozłącz P2P
        </button>
      </div>
    </header>

    <div v-if="webRtcStore.rtcStatus !== 'connected'" class="text-gray-500 text-sm mb-4">
      Połącz się z drugą osobą przez gniazdka i przejdź pomyślnie Handshake (Akceptuj), aby
      uruchomić ten panel.
    </div>

    <div v-else class="flex gap-5">
      <div class="flex-1 flex flex-col gap-3 border-r border-[#333] pr-5">
        <h3 class="text-sm font-bold text-gray-300 m-0">Szybki Czat</h3>
        <div
          class="bg-black/50 border border-[#222] rounded p-3 h-[150px] overflow-y-auto text-sm font-mono flex flex-col gap-1"
        >
          <div
            v-for="(msg, i) in webRtcStore.chatMessages"
            :key="i"
            :class="msg.startsWith('Ja:') ? 'text-emerald-400 text-right' : 'text-blue-400'"
          >
            {{ msg }}
          </div>
          <div v-if="webRtcStore.chatMessages.length === 0" class="text-gray-600">
            Brak wiadomości...
          </div>
        </div>
        <form class="flex gap-2" @submit.prevent="handleSend">
          <input
            v-model="chatInput"
            type="text"
            placeholder="Napisz coś..."
            class="flex-1 p-2 bg-black border border-[#444] rounded text-white text-sm"
          />
          <button
            type="submit"
            class="px-4 bg-emerald-600 hover:bg-emerald-500 rounded text-white text-sm font-bold"
          >
            Wyślij
          </button>
        </form>
      </div>

      <div class="flex-1 flex flex-col gap-3">
        <h3 class="text-sm font-bold text-gray-300 m-0">Radar Myszki</h3>
        <p class="text-xs text-gray-500 leading-tight m-0">
          Ruszaj kursorem po tym czarnym polu. Poniżej zobaczysz kursor partnera z opóźnieniem P2P!
        </p>

        <div
          class="relative h-[150px] bg-black border border-[#444] rounded cursor-crosshair overflow-hidden"
          @mousemove="handleMouseMove"
        >
          <div
            class="absolute inset-0 flex items-center justify-center text-[#222] font-black text-4xl pointer-events-none select-none"
          >
            TWOJE POLO
          </div>

          <div
            class="absolute w-4 h-4 bg-rose-500 rounded-full blur-[2px] transition-all duration-75 ease-linear pointer-events-none shadow-[0_0_10px_#f43f5e]"
            :style="{
              left: `${webRtcStore.remoteMouse.x}%`,
              top: `${webRtcStore.remoteMouse.y}%`,
              transform: 'translate(-50%, -50%)'
            }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWebRtcStore } from '@renderer/stores/useWebRtcStore'

const webRtcStore = useWebRtcStore()
const chatInput = ref('')

const handleSend = (): void => {
  if (chatInput.value.trim()) {
    webRtcStore.sendChatMessage(chatInput.value)
    chatInput.value = ''
  }
}

// Liczymy procentową pozycję myszki, żeby działało na każdym ekranie
const handleMouseMove = (e: MouseEvent): void => {
  if (webRtcStore.rtcStatus !== 'connected') return

  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()

  // Przeliczamy na wartości od 0 do 100 (%)
  const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
  const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)

  // Wysyłamy przez P2P
  webRtcStore.sendMousePosition(x, y)
}
</script>
