<template>
  <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 shadow-xl max-w-2xl mx-auto">
    <header class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold text-white m-0">Panel Sterowania WebSocket</h2>

      <div class="flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 border border-[#333]">
        <div :class="['w-2.5 h-2.5 rounded-full shadow-sm', connectionColor]"></div>
        <span class="text-xs font-mono uppercase tracking-wider text-gray-400">
          {{ isConnected ? `Połączono: ${socketId.slice(0, 8)}` : 'Rozłączono' }}
        </span>
      </div>
    </header>

    <transition name="fade">
      <section
        v-if="incomingRequest"
        class="mb-6 overflow-hidden border border-blue-500/50 rounded-xl bg-blue-950/20 shadow-lg shadow-blue-500/10"
      >
        <div class="p-4 bg-blue-500/10 flex flex-col gap-3">
          <div class="flex items-center gap-2 text-blue-300">
            <span class="text-xl">🔔</span>
            <span class="font-semibold text-sm">Nowa prośba o dostęp do sesji</span>
          </div>

          <p class="text-[10px] font-mono text-blue-400/70 truncate bg-black/20 p-2 rounded">
            ID Sesji: {{ incomingRequest.sessionId }}
          </p>

          <div class="grid grid-cols-2 gap-3 mt-1">
            <button
              class="py-2 px-4 text-white rounded-lg font-bold transition-all active:scale-95 text-sm bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20"
              @click="handleRespond(true)"
            >
              Akceptuj
            </button>
            <button
              class="py-2 px-4 text-white rounded-lg font-bold transition-all active:scale-95 text-sm bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/20"
              @click="handleRespond(false)"
            >
              Odrzuć
            </button>
          </div>
        </div>
      </section>
    </transition>

    <section v-if="accessStatus" class="mb-6 text-center animate-pulse">
      <div
        v-if="accessStatus === 'accepted'"
        class="p-3 border rounded-lg text-sm font-medium text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      >
        ✅ Dostęp przyznany! Sesja aktywna.
      </div>
      <div
        v-if="accessStatus === 'rejected'"
        class="p-3 border rounded-lg text-sm font-medium text-rose-400 border-rose-500/30 bg-rose-500/10"
      >
        ❌ Prośba o dostęp została odrzucona.
      </div>
    </section>

    <form class="space-y-4" @submit.prevent="handleConnect">
      <div class="relative">
        <input
          v-model="token"
          type="text"
          placeholder="Wklej connectionToken..."
          class="w-full p-3 bg-white/5 border border-[#444] rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-600"
          :disabled="isConnected"
        />
      </div>

      <div class="flex gap-3">
        <button
          type="submit"
          :disabled="isConnected || !token"
          class="flex-1 py-3 px-4 bg-emerald-500 disabled:bg-gray-700 text-white rounded-lg font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
        >
          Połącz z serwerem
        </button>

        <button
          type="button"
          :disabled="!isConnected"
          class="px-6 py-3 bg-transparent border border-[#444] text-gray-400 hover:text-rose-400 hover:border-rose-400 rounded-lg font-medium transition-all disabled:opacity-30"
          @click="handleDisconnect"
        >
          Rozłącz
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { WsRequestAccess } from '@shared/schemas/ws'

// Rozszerzamy emit o parametr 'source', aby logi trafiały do wsLog
const emit = defineEmits<{
  (e: 'log-result', action: string, data: unknown, source?: 'api' | 'socket'): void
}>()

// --- State ---
const token = ref('')
const isConnected = ref(false)
const socketId = ref('')
const incomingRequest = ref<WsRequestAccess | null>(null)
const accessStatus = ref<'accepted' | 'rejected' | null>(null)

// --- Computed ---
const connectionColor = computed(() =>
  isConnected.value ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'
)

// --- Actions ---
const handleConnect = async (): Promise<void> => {
  if (!token.value) return
  accessStatus.value = null
  emit('log-result', 'WS_ACTION_CONNECT', 'Próba połączenia...', 'socket')
  await window.api.ws.connect(token.value)
}

const handleDisconnect = async (): Promise<void> => {
  emit('log-result', 'WS_ACTION_DISCONNECT', 'Rozłączanie...', 'socket')
  await window.api.ws.disconnect()
  accessStatus.value = null
}

const handleRespond = async (accept: boolean): Promise<void> => {
  if (!incomingRequest.value) return

  const payload = {
    sessionId: incomingRequest.value.sessionId
  }

  const actionName = accept ? 'ACCEPT' : 'REJECT'
  emit('log-result', `WS_RESPOND_${actionName}`, `Wysłano decyzję: ${actionName}`, 'socket')

  if (accept) {
    await window.api.ws.respondAccept(payload)
  } else {
    await window.api.ws.respondReject(payload)
  }

  incomingRequest.value = null
}

// --- Lifecycle & Listeners ---
onMounted(() => {
  // Listenery Systemowe (Socket.io)
  window.api.ws.onConnected((data) => {
    isConnected.value = true
    socketId.value = data.socketId
    emit('log-result', 'SYSTEM_CONNECTED', data, 'socket')
  })

  window.api.ws.onDisconnected((data) => {
    isConnected.value = false
    socketId.value = ''
    incomingRequest.value = null
    accessStatus.value = null
    emit('log-result', 'SYSTEM_DISCONNECTED', data, 'socket')
  })

  window.api.ws.onConnectError((data) => {
    emit('log-result', 'SYSTEM_CONNECT_ERROR', data, 'socket')
  })

  // Listenery Biznesowe (Logika Aplikacji)
  window.api.ws.onRequestAccess((data) => {
    incomingRequest.value = data
    emit('log-result', 'REQ_RECEIVED', data, 'socket')
  })

  window.api.ws.onAccessAccepted((data) => {
    accessStatus.value = 'accepted'
    emit('log-result', 'REQ_ACCEPTED_BY_HOST', data, 'socket')
  })

  window.api.ws.onAccessRejected((data) => {
    accessStatus.value = 'rejected'
    emit('log-result', 'REQ_REJECTED_BY_HOST', data, 'socket')
  })

  window.api.ws.onServerError((data) => {
    emit('log-result', 'SERVER_ERROR', data, 'socket')
  })
})

onUnmounted(() => {
  // Sprzątamy, aby nie dublować logów przy przeładowaniu komponentu
  window.api.ws.removeAllListeners()
})
</script>

<style scoped>
/* Animacje przejścia dla powiadomień */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
