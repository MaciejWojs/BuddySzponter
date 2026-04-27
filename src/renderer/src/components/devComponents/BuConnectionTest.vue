<template>
  <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5 col-span-1 md:col-span-2 relative">
    <h2 class="text-xl font-semibold mb-4 mt-0">Tworzenie Połączenia (Host)</h2>

    <div
      v-if="connectionStore.isHost"
      class="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center animate-pulse"
    >
      <p class="text-xs text-emerald-400 uppercase font-bold mb-1">
        Twój kod połączenia (Podaj Gościowi):
      </p>
      <p class="text-3xl font-mono text-white tracking-[0.2em]">
        {{ connectionStore.connectionCode || 'Generowanie...' }}
      </p>
    </div>

    <form class="flex flex-col gap-2.5" @submit.prevent="handleCreateConnection">
      <div class="relative flex w-full">
        <input
          v-model="connectionStore.connectionPassword"
          :type="showPassword ? 'text' : 'password'"
          placeholder="Hasło do połączenia (min. 8 znaków)"
          required
          class="p-2.5 pr-10 border border-[#444] rounded bg-white/5 text-[#e0e0e0] focus:outline-none focus:border-[#42b883] transition-colors w-full"
          :disabled="socketStore.isConnected"
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

      <input
        v-model.number="form.userId"
        type="number"
        placeholder="User ID (opcjonalne)"
        class="p-2.5 border border-[#444] rounded bg-white/5 text-[#e0e0e0] focus:outline-none focus:border-[#42b883] transition-colors"
        :disabled="socketStore.isConnected"
      />

      <button
        type="submit"
        :disabled="socketStore.isConnected || connectionStore.connectionPassword.length < 8"
        class="p-3 mt-2 bg-orange-500 text-white border-none rounded-lg cursor-pointer font-bold hover:bg-orange-600 transition-all active:scale-95 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {{
          socketStore.isConnected
            ? '✅ Połączono i Gotowe (Host)'
            : connectionStore.connectionCode
              ? '🔄 Wymuś Nowy Kod'
              : '🔗 Utwórz Połączenie'
        }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useConnectionStore } from '@renderer/stores/connectionStore'
import { useSocketStore } from '@renderer/stores/socketStore'
import { ref, watch } from 'vue'

const emit = defineEmits<{
  (e: 'log-result', action: string, data: unknown, source?: 'api' | 'socket'): void
}>()

const connectionStore = useConnectionStore()
const socketStore = useSocketStore()

const showPassword = ref(false)
const form = ref({
  userId: undefined as number | undefined
})

const handleCreateConnection = async (): Promise<void> => {
  emit('log-result', 'WS_CREATE_CONNECTION', 'Wymuszanie nowej sesji...', 'api')

  const response = await connectionStore.createHostConnection()
  if (response?.success) {
    emit('log-result', 'WS_CREATE_SUCCESS', 'api')
  } else {
    emit('log-result', 'WS_CREATE_ERROR', response?.message, 'api')
  }
}

watch(
  () => connectionStore.connectionCode,
  (newCode) => {
    if (newCode) {
      emit('log-result', 'CONNECTION_CODE', `Nowy kod połączenia: ${newCode}`, 'api')
    }
  }
)
</script>
