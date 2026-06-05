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
        <div class="flex-1 md:border-r border-[#333] md:pr-5">
          <ChatPanel class="h-96" />
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { useHidChannel } from '@renderer/composables/channels/HidChannel'
import { SystemEventsChannel } from '@renderer/composables/channels/SystemEventsChannel'
import ChatPanel from '@renderer/components/chat/ChatPanel.vue'

const webRtcStore = useWebRtcStore()
const hidChannel = useHidChannel()
const systemEvents = SystemEventsChannel(() => webRtcStore.forceDisconnect())

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
