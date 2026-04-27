<template>
  <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5 col-span-1 md:col-span-2 relative">
    <h2 class="text-xl font-semibold mb-4 mt-0">Dołączanie do Połączenia (Gość)</h2>

    <div v-if="connectionStore.connectionCode && !connectionStore.isHost" class="mb-4 text-center">
      <div
        v-if="socketStore.isAcknowledged"
        class="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
      >
        <p class="text-xs text-emerald-400 font-bold">
          Połączono z sesją: {{ connectionStore.connectionCode }}
        </p>
      </div>
      <div
        v-else-if="socketStore.isAccessRejected"
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

      <div class="relative flex w-full">
        <input
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="Hasło"
          required
          class="p-2.5 pr-10 border border-[#444] rounded bg-white/5 text-[#e0e0e0] focus:outline-none focus:border-emerald-500 transition-colors w-full"
          :disabled="socketStore.isConnected && !connectionStore.isHost"
        />
        <button
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
          title="Pokaż / Ukryj hasło"
          @click="showPassword = !showPassword"
        >
          <svg
            v-if="!showPassword"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path
              d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"
            />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        </button>
      </div>

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

const showPassword = ref(false)

const form = ref({
  connectionCode: '',
  password: '#Pracownia123'
})

const handleJoinConnection = async (): Promise<void> => {
  // Jeśli użytkownik był hostem i nagle próbuje dołączyć do kogoś innego,
  // logujemy to w konsoli (store i tak to obsłuży i zresetuje tryb)
  if (connectionStore.isHost) {
    emit('log-result', 'CLEARING_STATE', 'api')
  }

  emit('log-result', 'WS_JOIN_CONNECTION', 'api')

  try {
    const res = await connectionStore.joinGuestConnection({
      connectionCode: form.value.connectionCode,
      password: form.value.password
    })

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
