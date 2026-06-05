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
        {{ connectionStore.connectionCode }}
      </p>
    </div>

    <form class="flex flex-col gap-2.5" @submit.prevent="handleCreateConnection">
      <div class="flex gap-2">
        <input
          v-model="form.password"
          type="password"
          placeholder="Hasło do połączenia"
          required
          class="flex-1 p-2.5 border border-[#444] rounded bg-white/5 text-[#e0e0e0] focus:outline-none focus:border-[#42b883] transition-colors"
        />
        <button
          v-if="form.password !== connectionStore.connectionPassword"
          type="button"
          class="px-4 bg-emerald-600 border border-emerald-500 rounded text-white hover:bg-emerald-500 transition-colors cursor-pointer flex items-center justify-center active:scale-95 whitespace-nowrap"
          title="Zapisz nowe hasło i zrestartuj sesję"
          @click="handleChangePassword"
        >
          💾 Zapisz
        </button>
        <button
          type="button"
          class="px-4 bg-[#333] border border-[#444] rounded text-gray-300 hover:bg-[#444] transition-colors cursor-pointer flex items-center justify-center active:scale-95"
          title="Kopiuj hasło"
          @click="copyPassword"
        >
          📋
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
        :disabled="socketStore.isConnected"
        class="p-3 mt-2 bg-orange-500 text-white border-none rounded-lg cursor-pointer font-bold hover:bg-orange-600 transition-all active:scale-95 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {{ socketStore.isConnected ? '✅ Połączono i Gotowe (Host)' : '🔗 Utwórz Połączenie' }}
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

// Inicjalizacja Store'ów
const connectionStore = useConnectionStore()
const socketStore = useSocketStore()

const form = ref({
  password: connectionStore.connectionPassword,
  userId: undefined as number | undefined
})

// Automatycznie zaktualizuj formularz testowy nowo wygenerowanym hasłem ze store
watch(
  () => connectionStore.connectionPassword,
  (newPass) => {
    if (newPass) {
      form.value.password = newPass
    }
  },
  { immediate: true }
)

const copyPassword = async (): Promise<void> => {
  if (form.value.password) {
    try {
      await navigator.clipboard.writeText(form.value.password)
    } catch (e) {
      console.error('Nie udało się skopiować hasła', e)
    }
  }
}

const handleChangePassword = async (): Promise<void> => {
  if (!form.value.password || form.value.password.length < 4) {
    emit('log-result', 'WS_CREATE_ERROR', 'Hasło musi mieć co najmniej 4 znaki', 'api')
    return
  }

  emit('log-result', 'WS_CREATE_CONNECTION', 'Zmiana hasła i restart sesji...', 'api')

  connectionStore.connectionPassword = form.value.password
  const response = await connectionStore.createHostConnection()
  if (response?.success) {
    emit('log-result', 'WS_CREATE_SUCCESS', 'Hasło zostało pomyślnie zmienione!', 'api')
  } else {
    emit('log-result', 'WS_CREATE_ERROR', response?.message, 'api')
  }
}

const handleCreateConnection = async (): Promise<void> => {
  emit('log-result', 'WS_CREATE_CONNECTION', 'Tworzenie sesji HTTP...', 'api')

  connectionStore.connectionPassword = form.value.password
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
