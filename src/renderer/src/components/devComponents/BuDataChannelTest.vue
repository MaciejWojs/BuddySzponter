<template>
  <div
    class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5 shadow-xl relative overflow-hidden shrink-0 mb-8"
  >
    <header class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold m-0 text-white">Test DataChannel P2P</h2>

      <div class="flex items-center gap-3">
        <span
          class="px-3 py-1 rounded bg-black border border-[#444] text-xs font-mono shadow-inner transition-colors"
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

    <div v-else class="flex flex-col gap-5">
      <div class="flex flex-col md:flex-row gap-5">
        <div class="flex-1 flex flex-col gap-3 md:border-r border-[#333] md:pr-5">
          <h3 class="text-sm font-bold text-blue-400 m-0">💬 Szybki Czat (chat-channel)</h3>
          <div
            class="bg-black/50 border border-[#222] rounded p-3 h-37.5 overflow-y-auto text-sm font-mono flex flex-col gap-1 shadow-inner"
          >
            <div
              v-for="(msg, i) in chatChannel.chatMessages.value"
              :key="i"
              :class="msg.startsWith('Ja:') ? 'text-emerald-400 text-right' : 'text-blue-400'"
            >
              {{ msg }}
            </div>
            <div v-if="chatChannel.chatMessages.value.length === 0" class="text-gray-600">
              Brak wiadomości...
            </div>
          </div>
          <form class="flex gap-2" @submit.prevent="handleSend">
            <input
              v-model="chatInput"
              type="text"
              placeholder="Napisz coś..."
              class="flex-1 p-2 bg-black border border-[#444] rounded text-white text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              class="px-4 bg-emerald-600 hover:bg-emerald-500 rounded text-white text-sm font-bold transition-colors"
            >
              Wyślij
            </button>
          </form>
        </div>

        <div class="flex-1 flex flex-col gap-3">
          <h3 class="text-sm font-bold text-rose-400 m-0">🖱️ HID Control (hid-control)</h3>
          <p class="text-xs text-gray-500 leading-tight m-0">
            Ruszaj kursorem po czarnym polu. Poniżej widać kursor partnera!
          </p>

          <div
            class="relative h-37.5 bg-black border border-[#444] rounded cursor-crosshair overflow-hidden shadow-inner"
            @mousemove="handleMouseMove"
          >
            <div
              class="absolute inset-0 flex items-center justify-center text-[#222] font-black text-4xl pointer-events-none select-none"
            >
              TWOJE POLE
            </div>

            <div
              class="absolute w-4 h-4 bg-rose-500 rounded-full blur-[2px] transition-all duration-75 ease-linear pointer-events-none shadow-[0_0_10px_#f43f5e]"
              :style="{
                left: `${hidChannel.remoteMouse.value.x}%`,
                top: `${hidChannel.remoteMouse.value.y}%`,
                transform: 'translate(-50%, -50%)'
              }"
            ></div>
          </div>
        </div>
      </div>

      <div class="pt-4 border-t border-[#333]">
        <h3 class="text-sm font-bold text-yellow-400 mb-3 m-0">⚙️ System Events (system-events)</h3>
        <div class="flex gap-3">
          <button
            class="px-4 py-2 bg-[#222] border border-[#444] hover:bg-[#333] hover:border-yellow-500 text-gray-300 hover:text-yellow-400 rounded text-xs font-bold transition-all"
            @click="systemEvents.sendVideoCommand('PAUSE_VIDEO')"
          >
            ⏸ Pauzuj Wideo
          </button>
          <button
            class="px-4 py-2 bg-[#222] border border-[#444] hover:bg-[#333] hover:border-emerald-500 text-gray-300 hover:text-emerald-400 rounded text-xs font-bold transition-all"
            @click="systemEvents.sendVideoCommand('RESUME_VIDEO')"
          >
            ▶ Wznów Wideo
          </button>
          <button
            class="px-4 py-2 bg-[#222] border border-[#444] hover:bg-[#333] hover:border-blue-500 text-gray-300 hover:text-blue-400 rounded text-xs font-bold transition-all"
            @click="systemEvents.sendVideoCommand('LOWER_QUALITY')"
          >
            📉 Wymuś Zrzut Jakości
          </button>
        </div>
      </div>

      <div class="pt-4 border-t border-[#333]">
        <h3 class="text-sm font-bold text-cyan-400 mb-3 m-0">📊 Metrics (metrics)</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div class="bg-black/40 border border-[#333] rounded p-3">
            <p class="m-0 text-gray-400 mb-2">Lokalne</p>
            <p class="m-0 text-white">FPS: {{ webRtcStore.localMetrics?.fps ?? '-' }}</p>
            <p class="m-0 text-white">RTT: {{ webRtcStore.localMetrics?.rttMs ?? '-' }} ms</p>
            <p class="m-0 text-white">CPU: {{ webRtcStore.localMetrics?.cpuLoadPct ?? '-' }}%</p>
          </div>

          <div class="bg-black/40 border border-[#333] rounded p-3">
            <p class="m-0 text-gray-400 mb-2">Zdalne</p>
            <p class="m-0 text-white">FPS: {{ webRtcStore.remoteMetrics?.fps ?? '-' }}</p>
            <p class="m-0 text-white">RTT: {{ webRtcStore.remoteMetrics?.rttMs ?? '-' }} ms</p>
            <p class="m-0 text-white">CPU: {{ webRtcStore.remoteMetrics?.cpuLoadPct ?? '-' }}%</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { useChatChannel } from '@renderer/composables/channels/ChatChannel'
import { useHidChannel } from '@renderer/composables/channels/HidChannel'
import { SystemEventsChannel } from '@renderer/composables/channels/SystemEventsChannel'

const webRtcStore = useWebRtcStore()
const chatChannel = useChatChannel()
const hidChannel = useHidChannel()
const systemEvents = SystemEventsChannel(() => webRtcStore.forceDisconnect())

const chatInput = ref('')

const handleSend = (): void => {
  if (chatInput.value.trim()) {
    chatChannel.sendChatMessage(chatInput.value, 'Rozmówca')
    chatInput.value = ''
  }
}

const handleMouseMove = (e: MouseEvent): void => {
  if (webRtcStore.rtcStatus !== 'connected') return

  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()

  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100

  // Wysyłamy przez nasz wydzielony kanał HID
  hidChannel.sendMouseFromVideo(x, y)
}
</script>
