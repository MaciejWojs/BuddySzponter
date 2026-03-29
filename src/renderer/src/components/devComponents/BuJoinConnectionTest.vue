<template>
  <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5 col-span-1 md:col-span-2">
    <h2 class="text-xl font-semibold mb-4 mt-0">Dołączanie do Połączenia (Join)</h2>
    <form class="flex flex-col gap-2.5" @submit.prevent="handleJoinConnection">
      <input
        v-model="form.connectionCode"
        type="text"
        placeholder="Kod połączenia (np. XYZ-123)"
        required
        class="p-2.5 border border-[#444] rounded bg-white/5 text-[#e0e0e0] focus:outline-none focus:border-[#42b883]"
      />
      <input
        v-model="form.password"
        type="password"
        placeholder="Hasło"
        required
        class="p-2.5 border border-[#444] rounded bg-white/5 text-[#e0e0e0] focus:outline-none focus:border-[#42b883]"
      />
      <button
        type="submit"
        class="p-2.5 bg-emerald-500 text-white border-none rounded cursor-pointer font-bold hover:bg-emerald-600 transition-colors mt-2"
      >
        🚀 Dołącz do Sesji
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ (e: 'log-result', action: string, data: unknown): void }>()

const form = ref({
  connectionCode: '',
  password: ''
})

const handleJoinConnection = async (): Promise<void> => {
  emit('log-result', 'JOIN_CONNECTION', 'Ładowanie...')
  try {
    const res = await window.api.connection.join({ ...form.value })

    // Rozbijamy logi na sukces i błąd w zależności od flagi 'success' ze schematu
    if (res.success) {
      emit('log-result', 'JOIN_CONNECTION_SUCCESS', res)
    } else {
      emit('log-result', 'JOIN_CONNECTION_FAILED', res)
    }
  } catch (e) {
    // Łapie błędy rzucone przez IPC / sieć
    emit('log-result', 'JOIN_CONNECTION_ERROR', e)
  }
}
</script>
