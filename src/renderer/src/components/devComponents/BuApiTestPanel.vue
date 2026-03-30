<template>
  <div
    class="h-screen bg-[#121212] text-[#e0e0e0] p-5 font-sans flex flex-col box-border overflow-hidden"
  >
    <div class="max-w-[1400px] w-full mx-auto flex flex-col h-full min-h-0">
      <header
        class="flex items-center justify-between gap-4 mb-5 border-b-2 border-[#333] pb-2.5 shrink-0"
      >
        <h1 class="text-2xl font-bold m-0">Panel Testowy API (Auth & WS)</h1>
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

          <BuSocketTest @log-result="logResult" />
        </div>

        <div class="flex-1 flex flex-col gap-5 min-w-[350px] min-h-0">
          <div
            class="bg-black border border-[#333] rounded-lg p-5 flex flex-col flex-1 min-h-0 box-border"
          >
            <h2 class="text-xl font-semibold mt-0 mb-2 shrink-0">Wynik z API (HTTP):</h2>
            <div
              class="grow overflow-y-auto bg-[#0a0a0a] rounded p-4 border border-[#222] custom-scrollbar"
            >
              <pre
                contenteditable="true"
                class="text-[#a6e22e] whitespace-pre-wrap break-words m-0 font-mono text-sm"
                >{{ outputLog || 'Czekam na akcję API...' }}</pre
              >
            </div>
          </div>

          <div
            class="bg-black border border-[#333] rounded-lg p-5 flex flex-col flex-1 min-h-0 box-border"
          >
            <h2 class="text-xl font-semibold mt-0 mb-2 shrink-0">Wynik z WebSocketów:</h2>
            <div
              class="grow overflow-y-auto bg-[#0a0a0a] rounded p-4 border border-[#222] custom-scrollbar"
            >
              <pre
                contenteditable="true"
                class="text-[#66d9ef] whitespace-pre-wrap break-words m-0 font-mono text-sm"
                >{{ wsLog || 'Czekam na zdarzenia WS...' }}</pre
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

// Importy Komponentów
import BuLanguageSelector from '../simpleComponents/BuLanguageSelector.vue'
import BuRegisterForm from './BuRegisterForm.vue'
import BuLoginForm from './BuLoginForm.vue'
import BuSessionActions from './BuSessionActions.vue'
import BuUserProfile from './BuUserProfile.vue'
import BuAvatarUpload from './BuAvatarUpload.vue'
import BuConnectionTest from './BuConnectionTest.vue'
import BuJoinConnectionTest from './BuJoinConnectionTest.vue'
import BuSystemInfo from './BuSystemInfo.vue'
import BuSocketTest from './BuSocketTest.vue'

// Stan Aplikacji
const outputLog = ref<string>('')
const wsLog = ref<string>('')
const currentUser = ref<UserResponseSchema | null>(null)

/**
 * Pomocnicza funkcja do formatowania wpisu w logach
 */
const formatEntry = (action: string, data: unknown): string => {
  const time = new Date().toLocaleTimeString()
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  return `[${time}] [${action}]\n${content}\n\n`
}

/**
 * Globalna metoda łapiąca logi ze wszystkich "Dzieci"
 * Teraz obsługuje 3 parametry!
 */
const logResult = (actionName: string, response: unknown, source?: 'api' | 'socket'): void => {
  const newEntry = formatEntry(actionName, response)

  // Sprawdzamy JAWNIE źródło 'socket' LUB prefix 'WS_' (dla starszych komponentów)
  if (source === 'socket' || actionName.startsWith('WS_')) {
    // DOPISUJEMY do logu (nie nadpisujemy), żeby widzieć historię pukania
    wsLog.value = wsLog.value + newEntry
  } else {
    // Logi HTTP/API
    outputLog.value = outputLog.value + newEntry
  }
}

// Czyszczenie usera
const clearUser = (): void => {
  currentUser.value = null
}

// Pobieranie profilu
const fetchCurrentUser = async (): Promise<void> => {
  logResult('GET_CURRENT_USER', 'Pobieranie danych użytkownika...', 'api')
  try {
    const res = await window.api.users.getCurrentUser()
    logResult('GET_CURRENT_USER_SUCCESS', res, 'api')

    if (res.success && res.data) {
      currentUser.value = res.data
    } else {
      currentUser.value = null
    }
  } catch (e) {
    logResult('GET_CURRENT_USER_ERROR', e, 'api')
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
