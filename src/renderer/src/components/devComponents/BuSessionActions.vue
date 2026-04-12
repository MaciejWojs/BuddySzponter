<template>
  <div
    class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5 col-span-1 md:col-span-2 flex flex-row gap-2.5 items-center"
  >
    <h2 class="text-xl font-semibold m-0">Akcje Sesji</h2>
    <p class="m-0 mr-auto text-gray-400 text-sm ml-2">Przetestuj z tokenem i bez:</p>
    <button
      class="p-2.5 bg-blue-500 text-white border-none rounded cursor-pointer font-bold hover:bg-blue-600 transition-colors"
      @click="handleGetMe"
    >
      📳 Pobierz Profil (/me)
    </button>
    <button
      class="p-2.5 bg-red-500 text-white border-none rounded cursor-pointer font-bold hover:bg-red-600 transition-colors"
      @click="handleLogout"
    >
      🥶 Wyloguj
    </button>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'log-result', action: string, data: unknown): void
  (e: 'user-logged-out'): void
}>()

const handleGetMe = async (): Promise<void> => {
  emit('log-result', 'GET_ME', 'Ładowanie...')
  try {
    const res = await window.api.auth.getMe()
    emit('log-result', 'GET_ME', res)
  } catch (e) {
    emit('log-result', 'GET_ME_ERROR', e)
  }
}

const handleLogout = async (): Promise<void> => {
  emit('log-result', 'LOGOUT', 'Ładowanie...')
  try {
    const res = await window.api.auth.logout()
    emit('log-result', 'LOGOUT', res)
    emit('user-logged-out')
  } catch (e) {
    emit('log-result', 'LOGOUT_ERROR', e)
  }
}
</script>
