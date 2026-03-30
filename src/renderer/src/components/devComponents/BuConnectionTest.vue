<template>
  <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5 col-span-1 md:col-span-2">
    <h2 class="text-xl font-semibold mb-4 mt-0">Tworzenie Połączenia (Connection)</h2>
    <form class="flex flex-col gap-2.5" @submit.prevent="handleCreateConnection">
      <input
        v-model="form.password"
        type="password"
        placeholder="Hasło do połączenia"
        required
        class="p-2.5 border border-[#444] rounded bg-white/5 text-[#e0e0e0] focus:outline-none focus:border-[#42b883]"
      />
      <input
        v-model.number="form.userId"
        type="number"
        placeholder="User ID (opcjonalne)"
        class="p-2.5 border border-[#444] rounded bg-white/5 text-[#e0e0e0] focus:outline-none focus:border-[#42b883]"
      />
      <button
        type="submit"
        class="p-2.5 bg-orange-500 text-white border-none rounded cursor-pointer font-bold hover:bg-orange-600 transition-colors mt-2"
      >
        🔗 Utwórz Połączenie
      </button>
    </form>
  </div>
</template>

// BuConnectionTest.vue (tylko sekcja script)
<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ (e: 'log-result', action: string, data: unknown): void }>()

const form = ref({
  password: '#Pracownia123',
  userId: undefined as number | undefined
})

const handleCreateConnection = async (): Promise<void> => {
  emit('log-result', 'CREATE_CONNECTION', 'Ładowanie...')
  try {
    const requestData = {
      password: form.value.password,
      ...(form.value.userId ? { userId: form.value.userId } : {})
    }
    const res = await window.api.connection.create(requestData)

    if (res.success && res.data?.token) {
      emit('log-result', 'CREATE_CONNECTION_SUCCESS', res)
      emit('log-result', 'WS_CONNECTING', 'Otrzymano token, automatyczne łączenie z WebSocketem...')

      // Magia dzieje się tutaj:
      await window.api.ws.connect(res.data.token)
    } else {
      emit('log-result', 'CREATE_CONNECTION_FAILED', res)
    }
  } catch (e) {
    emit('log-result', 'CREATE_CONNECTION_ERROR', e)
  }
}
</script>
