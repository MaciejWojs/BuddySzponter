<template>
  <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5">
    <h2 class="text-xl font-semibold mb-4 mt-0">Rejestracja</h2>
    <form class="flex flex-col gap-2.5" @submit.prevent="handleRegister">
      <input
        v-model="form.nickname"
        type="text"
        placeholder="Nickname (min 3 znaki)"
        required
        class="p-2.5 border border-[#444] rounded bg-white/5 text-[#e0e0e0] focus:outline-none focus:border-[#42b883]"
      />
      <input
        v-model="form.email"
        type="email"
        placeholder="Email"
        required
        class="p-2.5 border border-[#444] rounded bg-white/5 text-[#e0e0e0] focus:outline-none focus:border-[#42b883]"
      />
      <input
        v-model="form.password"
        type="password"
        placeholder="Hasło (min 8 znaków)"
        required
        class="p-2.5 border border-[#444] rounded bg-white/5 text-[#e0e0e0] focus:outline-none focus:border-[#42b883]"
      />
      <input
        v-model="form.passwordConfirm"
        type="password"
        placeholder="Powtórz hasło"
        required
        class="p-2.5 border border-[#444] rounded bg-white/5 text-[#e0e0e0] focus:outline-none focus:border-[#42b883]"
      />
      <button
        type="submit"
        class="p-2.5 bg-[#42b883] text-white border-none rounded cursor-pointer font-bold hover:bg-[#33a06f] transition-colors"
      >
        Zarejestruj
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ (e: 'log-result', action: string, data: unknown): void }>()

const form = ref({
  nickname: 'testuser',
  email: 'test@example.com',
  password: '#Pracownia123',
  passwordConfirm: '#Pracownia123'
})

const handleRegister = async (): Promise<void> => {
  emit('log-result', 'REGISTER', 'Ładowanie...')
  try {
    const res = await window.api.auth.register({ ...form.value })
    emit('log-result', 'REGISTER', res)
  } catch (e) {
    emit('log-result', 'REGISTER_ERROR', e)
  }
}
</script>
