<template>
  <div
    class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5 col-span-1 md:col-span-2 shadow-xl relative overflow-hidden shrink-0 mb-8"
  >
    <header class="flex justify-between items-center mb-5">
      <div>
        <h2 class="text-xl font-bold text-white m-0">Panel WebSocket</h2>
        <p class="text-[11px] text-gray-500 uppercase tracking-widest font-semibold mt-1">
          Rola:
          <span :class="connectionStore.isHost ? 'text-purple-400' : 'text-blue-400'">{{
            connectionStore.isHost ? 'Host' : 'Gość'
          }}</span>
        </p>
      </div>

      <div
        class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-[#444] shadow-inner"
      >
        <div
          class="w-2.5 h-2.5 rounded-full transition-colors duration-300"
          :class="
            socketStore.isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'
          "
        ></div>
        <span class="text-xs font-mono uppercase tracking-wider text-gray-300">
          {{ socketStore.isConnected ? 'Połączono (WS)' : 'Rozłączono' }}
        </span>
      </div>
    </header>

    <transition name="slide-down">
      <section
        v-if="socketStore.incomingRequest"
        class="relative p-4 mb-5 bg-blue-950/30 border border-blue-500/50 rounded-xl shadow-lg shadow-blue-500/10 overflow-hidden"
      >
        <div
          class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"
        ></div>

        <div class="flex items-start gap-3">
          <div class="p-2 bg-blue-500/20 rounded-lg text-xl animate-bounce">🔔</div>
          <div class="flex-1">
            <h3 class="text-sm font-bold text-blue-300 m-0">Nowa prośba o dostęp!</h3>
            <p
              class="text-[10px] text-blue-400/70 font-mono mt-1 bg-black/30 p-1.5 rounded inline-block"
            >
              ID Sesji: {{ socketStore.incomingRequest.sessionId }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mt-4">
          <button
            class="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
            @click="handleRespond(true)"
          >
            ✅ Akceptuj
          </button>
          <button
            class="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 shadow-lg shadow-rose-900/20"
            @click="handleRespond(false)"
          >
            ❌ Odrzuć
          </button>
        </div>
      </section>
    </transition>

    <section
      v-if="socketStore.accessStatus && !socketStore.incomingRequest"
      class="mb-5 text-center"
    >
      <div
        v-if="socketStore.accessStatus === 'accepted'"
        class="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
      >
        <span class="text-xs font-bold text-emerald-400"
          >Dostęp przyznany. Handshake WebRTC w toku...</span
        >
      </div>
      <div
        v-else-if="socketStore.accessStatus === 'rejected'"
        class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg"
      >
        <span class="text-xs font-bold text-rose-400">Dostęp został odrzucony.</span>
      </div>
    </section>

    <footer class="pt-4 mt-2 border-t border-[#333] flex justify-between items-center">
      <span class="text-[10px] text-gray-600 uppercase font-bold">Narzędzia Debugowania</span>
      <div class="flex gap-2">
        <button
          v-if="!socketStore.isConnected"
          class="px-4 py-2 bg-[#333] hover:bg-[#444] text-gray-300 text-xs font-semibold rounded transition-colors"
          @click="handleManualConnect()"
        >
          Połącz ręcznie
        </button>
        <button
          v-if="socketStore.isConnected"
          class="px-4 py-2 bg-transparent border border-[#444] hover:border-rose-500 hover:text-rose-400 text-gray-400 text-xs font-semibold rounded transition-colors"
          @click="handleManualDisconnect()"
        >
          Rozłącz gniazdko
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useConnectionStore } from '@renderer/stores/connectionStore'
import { useSocketStore } from '@renderer/stores/useSocketStore'
import { watch } from 'vue'

const connectionStore = useConnectionStore()
const emit = defineEmits<{
  (e: 'log-result', action: string, data: unknown, source?: 'api' | 'socket'): void
}>()

const socketStore = useSocketStore()

// ==========================================
// --- NASŁUCHIWANIE ZMIAN W STORE (LOGI) ---
// ==========================================

watch(
  () => socketStore.isConnected,
  (isConnected) => {
    if (isConnected) {
      emit('log-result', 'WS_CONNECTED', 'Nawiązano fizyczne połączenie z gniazdkiem.', 'socket')
    } else {
      emit('log-result', 'WS_DISCONNECTED', 'Rozłączono z gniazdkiem.', 'socket')
    }
  }
)

watch(
  () => socketStore.incomingRequest,
  (request) => {
    if (request) {
      emit('log-result', 'WS_INCOMING_REQUEST', request, 'socket')
    }
  }
)

// 3. Logowanie decyzji o dostępie (Handshake)
watch(
  () => socketStore.accessStatus,
  (status) => {
    if (status === 'accepted') {
      emit(
        'log-result',
        'WS_ACCESS_ACCEPTED',
        'Dostęp przyznany. Odsyłam ACK (Acknowledge).',
        'socket'
      )
    } else if (status === 'rejected') {
      emit('log-result', 'WS_ACCESS_REJECTED', 'Dostęp odrzucony.', 'socket')
    }
  }
)

watch(
  () => connectionStore.connectionCode,
  (code) => {
    if (code) {
      emit('log-result', 'CONNECTION_CODE_SET', `Kod połączenia ustawiony: ${code}`, 'api')
    }
  }
)

watch(
  () => socketStore.isAcknowledged,
  (ack) => {
    if (ack) {
      emit(
        'log-result',
        'WS_ACK_RECEIVED',
        'Otrzymano ACK od partnera. Handshake zakończony sukcesem!',
        'socket'
      )
    }
  }
)

// ==========================================
// --- NAKŁADKI NA AKCJE (Żeby logować kliknięcia) ---
// ==========================================

const handleRespond = async (accept: boolean): Promise<void> => {
  emit('log-result', 'WS_SENDING_RESPONSE', 'socket')
  await socketStore.respondToRequest(accept)
}

const handleManualConnect = async (): Promise<void> => {
  emit('log-result', 'WS_MANUAL_CONNECT', 'socket')
  await socketStore.connect('awaryjny-token-z-palca')
}

const handleManualDisconnect = async (): Promise<void> => {
  emit('log-result', 'WS_MANUAL_DISCONNECT', 'socket')
  await socketStore.disconnect()
}
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
</style>
