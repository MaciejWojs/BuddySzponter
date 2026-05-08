<script setup lang="ts">
import { useSocketStore } from '@renderer/stores/socketStore'
import { useSessionStore } from '@renderer/stores/sessionStore'

const socketStore = useSocketStore()
const sessionStore = useSessionStore()
</script>

<template>
  <section
    class="relative p-6 mt-4 w-full max-w-sm mx-auto bg-blue-950/30 border border-blue-500/50 rounded-xl shadow-lg shadow-blue-500/10 overflow-hidden"
  >
    <div class="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-400 to-indigo-500"></div>
    <div class="flex items-start gap-4 mb-2">
      <div class="p-3 bg-blue-500/20 rounded-xl text-3xl animate-bounce shadow-inner">🔔</div>
      <div class="flex-1 text-left">
        <h3 class="text-base font-bold text-blue-300 m-0 leading-tight">Nowa prośba o dostęp!</h3>
        <p
          class="text-[11px] text-blue-400/80 font-mono mt-1.5 bg-black/40 px-2 py-1 rounded inline-block shadow-inner"
        >
          ID Sesji:
          <span class="text-blue-200 font-bold">{{ socketStore.incomingRequest?.sessionId }}</span>
        </p>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3 mt-5">
      <button
        class="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 shadow-lg shadow-emerald-900/20 flex justify-center items-center gap-1.5"
        @click="sessionStore.handleRespond(true)"
      >
        <span class="text-base">✅</span> Akceptuj
      </button>
      <button
        class="py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 shadow-lg shadow-rose-900/20 flex justify-center items-center gap-1.5"
        @click="sessionStore.handleRespond(false)"
      >
        <span class="text-base">❌</span> Odrzuć
      </button>
    </div>
  </section>
</template>
