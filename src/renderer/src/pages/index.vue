<template>
  <div class="home-page">
    <div class="p-6 bg-gray-800 text-white rounded-lg max-w-md mx-auto mt-10">
      <h2 class="text-2xl font-bold mb-4">Test Komunikacji IPC (Auth)</h2>

      <div class="flex flex-col gap-3">
        <input
          v-model="form.nickname"
          placeholder="Nickname (tylko rejestracja)"
          class="p-2 bg-gray-700 rounded text-white"
        />
        <input
          v-model="form.email"
          type="email"
          placeholder="Email"
          class="p-2 bg-gray-700 rounded text-white"
        />
        <input
          v-model="form.password"
          type="password"
          placeholder="Hasło"
          class="p-2 bg-gray-700 rounded text-white"
        />
        <input
          v-model="form.passwordConfirm"
          type="password"
          placeholder="Potwierdź hasło"
          class="p-2 bg-gray-700 rounded text-white"
        />

        <div class="flex gap-2 mt-2">
          <button
            class="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-bold w-full"
            @click="testRegister"
          >
            Zarejestruj
          </button>
          <button
            class="bg-green-600 hover:bg-green-500 px-4 py-2 rounded font-bold w-full"
            @click="testLogin"
          >
            Zaloguj
          </button>
        </div>

        <button
          class="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded font-bold w-full mt-2"
          @click="testMe"
        >
          Pobierz mój profil (/me)
        </button>
      </div>

      <div v-if="loading" class="mt-4 text-yellow-400">Ładowanie...</div>

      <div
        v-if="successMsg"
        class="mt-4 p-3 bg-green-900 border border-green-500 rounded text-sm wrap-break-word"
      >
        <p class="font-bold">SUKCES:</p>
        <pre>{{ successMsg }}</pre>
      </div>

      <div
        v-if="errorMsg"
        class="mt-4 p-3 bg-red-900 border border-red-500 rounded text-sm wrap-break-word"
      >
        <p class="font-bold">BŁĄD:</p>
        <pre>{{ errorMsg }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

// Form state
const form = reactive({
  nickname: 'TestUser123',
  email: 'test@example.com',
  password: 'Password123!',
  passwordConfirm: 'Password123!' // Added for registration
})

const loading = ref(false)
const successMsg = ref<string | null>(null)
const errorMsg = ref<string | null>(null)

// --- TEST FUNCTIONS ---

const testRegister = async (): Promise<void> => {
  loading.value = true
  successMsg.value = null
  errorMsg.value = null

  // We use our secure IPC bridge!
  const response = await window.api.auth.register({
    nickname: form.nickname,
    email: form.email,
    password: form.password,
    passwordConfirm: form.passwordConfirm
  })

  loading.value = false

  if (response.success) {
    successMsg.value = response.data
  } else {
    // Here will fall validation errors e.g. from Zod (Hono) or 500 error
    errorMsg.value = response.data
  }
}

const testLogin = async (): Promise<void> => {
  loading.value = true
  successMsg.value = null
  errorMsg.value = null

  const response = await window.api.auth.login({
    email: form.email,
    password: form.password
  })

  loading.value = false

  if (response.success) {
    // Note: tokens are not here! They stayed in Main Process!
    successMsg.value = response.data
  } else {
    errorMsg.value = response.data
  }
}

const testMe = async (): Promise<void> => {
  loading.value = true
  successMsg.value = null
  errorMsg.value = null

  // We hit an endpoint requiring authorization (to check if the token works)
  const response = await window.api.auth.getMe()

  loading.value = false

  if (response.success) {
    successMsg.value = response.data
  } else {
    errorMsg.value = response.data
  }
}
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
</style>
