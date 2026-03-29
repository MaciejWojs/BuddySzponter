<template>
  <div
    class="h-screen bg-[#121212] text-[#e0e0e0] p-5 font-sans flex flex-col box-border overflow-hidden"
  >
    <div class="max-w-[1400px] w-full mx-auto flex flex-col h-full min-h-0">
      <header
        class="flex items-center justify-between gap-4 mb-5 border-b-2 border-[#333] pb-2.5 shrink-0"
      >
        <h1 class="text-2xl font-bold m-0">Panel Testowy API (Auth)</h1>
        <BuLanguageSelector class="ml-4" />
      </header>

      <div class="flex flex-col lg:flex-row gap-5 grow min-h-0">
        <div
          class="flex-[1.2] grid grid-cols-1 md:grid-cols-2 gap-5 content-start overflow-y-auto pr-2.5 pb-10 custom-scrollbar"
        >
          <BuRegisterForm @log-result="logResult" />
          <BuLoginForm @log-result="logResult" />

          <BuSessionActions @log-result="logResult" @user-logged-out="clearUser" />

          <BuUserProfile :user="currentUser" @fetch-user="fetchCurrentUser" />

          <BuAvatarUpload @log-result="logResult" />

          <BuConnectionTest @log-result="logResult" />

          <BuJoinConnectionTest @log-result="logResult" />

          <BuSystemInfo @log-result="logResult" />
        </div>

        <div class="flex-1 flex flex-col min-w-[350px] min-h-0">
          <div
            class="bg-black border border-[#333] rounded-lg p-5 flex flex-col h-full min-h-0 box-border"
          >
            <h2 class="text-xl font-semibold mt-0 mb-2 shrink-0">Wynik z Electrona:</h2>
            <div
              class="grow overflow-y-auto bg-[#0a0a0a] rounded p-4 border border-[#222] custom-scrollbar"
            >
              <pre
                contenteditable="true"
                class="text-[#a6e22e] whitespace-pre-wrap break-words m-0 font-mono text-sm"
                >{{ outputLog || 'Czekam na akcję...' }}</pre
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Schemat Typescript dla Użytkownika
import type { UserResponseSchema } from '@shared/schemas/user'

// Importy nowych Komponentów
import BuLanguageSelector from '../simpleComponents/BuLanguageSelector.vue'
import BuRegisterForm from './BuRegisterForm.vue'
import BuLoginForm from './BuLoginForm.vue'
import BuSessionActions from './BuSessionActions.vue'
import BuUserProfile from './BuUserProfile.vue'
import BuAvatarUpload from './BuAvatarUpload.vue'
import BuConnectionTest from './BuConnectionTest.vue'
import BuJoinConnectionTest from './BuJoinConnectionTest.vue' // <-- Dodany import
import BuSystemInfo from './BuSystemInfo.vue'

// Stan Aplikacji dla panelu
const outputLog = ref<unknown | string | null>(null)
const currentUser = ref<UserResponseSchema | null>(null)

// Globalna metoda łapiąca logi ze wszystkich "Dzieci"
const logResult = (_actionName: string, response: unknown): void => {
  outputLog.value = response
}

// Czyszczenie usera (uruchamiane na event z BuSessionActions po pomyślnym wylogowaniu)
const clearUser = (): void => {
  currentUser.value = null
}

// Globalne pobranie profilu, uruchamiane zdarzeniem z BuUserProfile
const fetchCurrentUser = async (): Promise<void> => {
  outputLog.value = 'Pobieranie danych aktualnego użytkownika...'
  try {
    const res = await window.api.users.getCurrentUser()
    logResult('GET_CURRENT_USER', res)

    if (res.success && res.data) {
      currentUser.value = res.data
    } else {
      currentUser.value = null
    }
  } catch (e) {
    logResult('GET_CURRENT_USER_ERROR', e)
    currentUser.value = null
  }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #1e1e1e;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #42b883;
}
</style>
