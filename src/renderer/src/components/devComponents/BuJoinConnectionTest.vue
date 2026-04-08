<template>
  <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5 col-span-1 md:col-span-2 relative">
    <h2 class="text-xl font-semibold mb-4 mt-0">Dołączanie do Połączenia (Gość)</h2>

    <div v-if="connectionStore.connectionCode && !connectionStore.isHost" class="mb-4 text-center">
      <div
        v-if="socketStore.accessStatus === 'accepted'"
        class="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
      >
        <p class="text-xs text-emerald-400 font-bold">
          Połączono z sesją: {{ connectionStore.connectionCode }}
        </p>
      </div>
      <div
        v-else-if="socketStore.accessStatus === 'rejected'"
        class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg"
      >
        <p class="text-xs text-rose-400 font-bold">Host odrzucił prośbę o dostęp.</p>
      </div>
      <div
        v-else-if="socketStore.isConnected"
        class="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg animate-pulse"
      >
        <p class="text-xs text-blue-400 font-bold">Oczekiwanie na akceptację przez Hosta...</p>
      </div>
    </div>

    <form class="flex flex-col gap-2.5" @submit.prevent="handleJoinConnection">
      <input
        v-model="form.connectionCode"
        type="text"
        placeholder="Kod połączenia (np. XYZ-123)"
        required
        class="p-2.5 border border-[#444] rounded bg-white/5 text-[#e0e0e0] focus:outline-none focus:border-emerald-500 transition-colors uppercase"
        :disabled="socketStore.isConnected && !connectionStore.isHost"
      />
      <input
        v-model="form.password"
        type="password"
        placeholder="Hasło"
        required
        class="p-2.5 border border-[#444] rounded bg-white/5 text-[#e0e0e0] focus:outline-none focus:border-emerald-500 transition-colors"
        :disabled="socketStore.isConnected && !connectionStore.isHost"
      />
      <button
        type="submit"
        :disabled="(socketStore.isConnected && !connectionStore.isHost) || !form.connectionCode"
        class="p-3 mt-2 bg-emerald-500 text-white border-none rounded-lg cursor-pointer font-bold hover:bg-emerald-600 transition-all active:scale-95 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {{
          socketStore.isConnected && !connectionStore.isHost
            ? '✅ Pukamy do Hosta...'
            : '🚀 Dołącz do Sesji'
        }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useConnectionStore } from '@renderer/stores/connectionStore'
import { useSocketStore } from '@renderer/stores/socketStore'
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'log-result', action: string, data: unknown, source?: 'api' | 'socket'): void
}>()

const connectionStore = useConnectionStore()
const socketStore = useSocketStore()

const form = ref({
  connectionCode: '',
  password: '#Pracownia123'
})

const handleJoinConnection = async (): Promise<void> => {
  if (connectionStore.isHost) {
    emit('log-result', 'CLEARING_STATE', 'api')
  }

  emit('log-result', 'WS_JOIN_CONNECTION', 'api')

  try {
    const res = await connectionStore.joinGuestConnection(
      form.value.connectionCode,
      form.value.password
    )

    if (res?.success) {
      emit('log-result', 'WS_JOIN_SUCCESS', 'api')
    } else {
      emit('log-result', 'WS_JOIN_ERROR', res?.message, 'api')
    }
  } catch (e) {
    emit('log-result', 'WS_JOIN_FATAL_ERROR', e, 'api')
  }
}
</script>
