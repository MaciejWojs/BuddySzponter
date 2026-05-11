<template>
  <main
    class="w-full h-full px-4 bg-[#1e1e1e]/90 border border-[#333] flex items-center justify-between text-[#e8e8e8] select-none overflow-hidden rounded-[16px]"
    style="-webkit-app-region: drag"
  >
    <div class="flex items-center gap-2" style="-webkit-app-region: no-drag">
      <button
        class="flex items-center justify-center w-10 h-10 rounded-lg transition-all border group"
        :class="
          state.micActive
            ? 'bg-[#2a2a2a] border-[#444] text-gray-200 hover:border-blue-500'
            : 'bg-rose-900/30 border-rose-700 text-rose-300'
        "
        :title="state.micActive ? 'Wycisz swój mikrofon' : 'Włącz mikrofon'"
        @click="$emit('sendCommand', 'TOGGLE_MIC')"
      >
        <span class="text-lg group-active:scale-90 transition-transform">{{
          state.micActive ? '🎙️' : '🎙️'
        }}</span>
      </button>

      <button
        class="flex items-center justify-center w-10 h-10 rounded-lg transition-all border group bg-[#2a2a2a] border-[#444] text-gray-200 hover:border-purple-500"
        title="Następny monitor"
        @click="$emit('goToNextMonitor')"
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
        @click="$emit('sendCommand', 'TOGGLE_SYSTEM')"
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
        @click="$emit('sendCommand', 'TOGGLE_GUEST_MIC')"
      >
        <span class="text-lg group-active:scale-90 transition-transform">{{
          state.guestMicActive ? '🎧' : '🔕'
        }}</span>
      </button>

      <button
        class="relative flex items-center justify-center w-10 h-10 rounded-lg transition-all border group"
        :class="
          state.chatHasUnread
            ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
            : 'bg-[#2a2a2a] border-[#444] text-gray-200 hover:border-blue-500'
        "
        :title="state.chatHasUnread ? 'Czat — nowe wiadomości' : 'Otwórz czat'"
        @click="$emit('toggleChat')"
      >
        <span class="text-lg group-active:scale-90 transition-transform">💬</span>
        <span
          v-if="state.chatHasUnread"
          class="absolute -top-1 -right-1 inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-[#1e1e1e]"
        />
      </button>

      <button
        class="flex items-center px-3 h-10 rounded-lg transition-all border group gap-2"
        :class="
          state.controlGranted
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
            : 'bg-[#2a2a2a] border-[#444] text-gray-400 hover:text-white'
        "
        :title="state.controlGranted ? 'Zabierz kontrolę' : 'Oddaj kontrolę myszy/klawiatury'"
        @click="$emit('sendCommand', 'TOGGLE_CONTROL')"
      >
        <span class="text-lg group-active:scale-90 transition-transform">{{
          state.controlGranted ? '🖱️' : '🔒'
        }}</span>
        <span class="text-xs font-bold">{{ state.controlGranted ? 'MYSZ ON' : 'MYSZ OFF' }}</span>
      </button>

      <button
        class="flex items-center justify-center px-3 h-10 ml-2 rounded-lg transition-all bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs tracking-wider border border-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.3)] active:scale-95"
        @click="$emit('sendCommand', 'END_SESSION')"
      >
        ZAKOŃCZ
      </button>

      <div class="w-px h-6 bg-[#444] mx-1"></div>

      <div class="flex flex-col gap-1 ml-1">
        <button
          class="flex items-center justify-center w-6 h-[18px] bg-[#2a2a2a] border border-[#444] rounded hover:border-gray-400 hover:text-white text-gray-400 transition-colors"
          title="Zwiń do małego okna (60x60)"
          @click="$emit('setWidgetMode', 'compact')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 14h6m0 0v6m0-6l-7 7m17-11h-6m0 0V4m0 6l7-7M4 10h6m0 0V4m0 6l-7-7m17 11h-6m0 0v6m0-6l7 7"
            />
          </svg>
        </button>
        <button
          class="flex items-center justify-center w-6 h-[18px] bg-[#2a2a2a] border border-[#444] rounded hover:border-gray-400 hover:text-white text-gray-400 transition-colors"
          title="Schowaj na górę ekranu"
          @click="$emit('setWidgetMode', 'hidden')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
          </svg>
        </button>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
defineProps<{
  state: {
    micActive: boolean
    sysActive: boolean
    guestMicActive: boolean
    controlGranted: boolean
    chatHasUnread: boolean
  }
}>()

defineEmits<{
  (e: 'sendCommand', actionType: string, payload?: unknown): void
  (e: 'goToNextMonitor'): void
  (e: 'setWidgetMode', mode: 'normal' | 'compact' | 'hidden' | 'peek'): void
  (e: 'toggleChat'): void
}>()
</script>
