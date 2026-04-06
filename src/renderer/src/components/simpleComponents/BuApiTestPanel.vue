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
          <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5">
            <h2 class="text-xl font-semibold mb-4 mt-0">Rejestracja</h2>
            <form class="flex flex-col gap-2.5" @submit.prevent="handleRegister">
              <input
                v-model="registerForm.nickname"
                type="text"
                placeholder="Nickname (min 3 znaki)"
                required
                class="p-2.5 border border-[#444] rounded bg-white/5 text-[#e0e0e0] focus:outline-none focus:border-[#42b883]"
              />
              <input
                v-model="registerForm.email"
                type="email"
                placeholder="Email"
                required
                class="p-2.5 border border-[#444] rounded bg-white/5 text-[#e0e0e0] focus:outline-none focus:border-[#42b883]"
              />
              <input
                v-model="registerForm.password"
                type="password"
                placeholder="Hasło (min 8 znaków)"
                required
                class="p-2.5 border border-[#444] rounded bg-white/5 text-[#e0e0e0] focus:outline-none focus:border-[#42b883]"
              />
              <input
                v-model="registerForm.passwordConfirm"
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

          <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5">
            <h2 class="text-xl font-semibold mb-4 mt-0">Logowanie</h2>
            <form class="flex flex-col gap-2.5" @submit.prevent="handleLogin">
              <input
                v-model="loginForm.email"
                type="email"
                placeholder="Email"
                required
                class="p-2.5 border border-[#444] rounded bg-white/5 text-[#e0e0e0] focus:outline-none focus:border-[#42b883]"
              />
              <input
                v-model="loginForm.password"
                type="password"
                placeholder="Hasło"
                required
                class="p-2.5 border border-[#444] rounded bg-white/5 text-[#e0e0e0] focus:outline-none focus:border-[#42b883]"
              />
              <button
                type="submit"
                class="p-2.5 bg-[#42b883] text-white border-none rounded cursor-pointer font-bold hover:bg-[#33a06f] transition-colors mt-auto"
              >
                Zaloguj
              </button>
            </form>
          </div>

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

          <div
            class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5 col-span-1 md:col-span-2 flex flex-col gap-4"
          >
            <div
              class="flex flex-row gap-2.5 items-center justify-between border-b border-[#333] pb-3"
            >
              <h2 class="text-xl font-semibold m-0">Twój Profil</h2>
              <button
                class="p-2.5 bg-purple-500 text-white border-none rounded cursor-pointer font-bold hover:bg-purple-600 transition-colors"
                @click="handleGetCurrentUser"
              >
                👤 Pobierz Aktualnego Usera
              </button>
            </div>

            <div v-if="currentUser" class="flex items-center gap-5 p-3 bg-black/30 rounded-lg">
              <div
                class="relative w-24 h-24 shrink-0 rounded-full border-2 border-[#42b883] overflow-hidden bg-[#2a2a2a] flex items-center justify-center"
              >
                <img
                  v-if="currentUser.avatar"
                  :src="getAvatarUrl(currentUser.avatar, '256')"
                  alt="User Avatar"
                  class="w-full h-full object-cover"
                />
                <span v-else class="text-3xl text-gray-500">?</span>
              </div>

              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                  <span class="text-2xl font-bold text-[#e0e0e0]">{{ currentUser.nickname }}</span>
                  <span
                    v-if="currentUser.roleId"
                    class="px-2 py-0.5 text-xs font-bold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  >
                    Rola: {{ currentUser.roleId }}
                  </span>
                </div>
                <span class="text-gray-400">{{ currentUser.email }}</span>

                <div class="flex gap-2 mt-2 text-xs">
                  <span
                    v-if="currentUser.isBanned"
                    class="px-2 py-1 bg-red-500/20 text-red-400 rounded border border-red-500/30"
                    >Zbanowany</span
                  >
                  <span
                    v-if="currentUser.isDeleted"
                    class="px-2 py-1 bg-gray-500/20 text-gray-400 rounded border border-gray-500/30"
                    >Usunięty</span
                  >
                  <span class="text-gray-500">ID: {{ currentUser.id }}</span>
                </div>
              </div>
            </div>

            <div
              v-else
              class="text-center p-5 text-gray-500 border border-dashed border-[#444] rounded"
            >
              Brak załadowanych danych. Kliknij przycisk powyżej lub zaloguj się.
            </div>
          </div>

          <div
            class="bg-[#1e1e1e] border-2 border-dashed border-[#444] rounded-lg p-5 col-span-1 md:col-span-2 transition-all duration-300 relative"
            :class="{ '!border-[#42b883] bg-[#42b883]/10 scale-[1.01]': isDraggingOver }"
            @dragover.prevent="onDragOver"
            @dragleave="onDragLeave"
            @drop.prevent="onDrop"
          >
            <h2 class="text-xl font-semibold mb-4 mt-0">Zarządzanie Użytkownikiem (Avatar)</h2>
            <div class="flex flex-row gap-2.5 items-center w-full">
              <p v-if="!isDraggingOver" class="m-0 mr-auto text-[#888]">
                Przeciągnij zdjęcie tutaj lub użyj przycisku ->
              </p>
              <p v-else class="m-0 mr-auto text-[#42b883] font-bold text-lg animate-pulse">
                UPUŚĆ TERAZ!
              </p>
              <button
                class="p-2.5 bg-blue-500 text-white border-none rounded cursor-pointer font-bold hover:bg-blue-600 transition-colors"
                @click="handleUploadAvatar"
              >
                🖼️ Wybierz plik
              </button>
            </div>
          </div>

          <div
            class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5 col-span-1 md:col-span-2 flex flex-row gap-2.5 items-center flex-wrap"
          >
            <h2 class="text-xl font-semibold m-0 mr-auto">Języki / Core</h2>
            <button
              class="p-2.5 bg-blue-500 text-white border-none rounded cursor-pointer font-bold hover:bg-blue-600 transition-colors"
              @click="handleSupportedVersions"
            >
              🌐 Supported Versions
            </button>
            <button
              class="p-2.5 bg-blue-500 text-white border-none rounded cursor-pointer font-bold hover:bg-blue-600 transition-colors"
              @click="handleLanguages"
            >
              🈯 Lista Języków
            </button>
            <button
              class="p-2.5 bg-blue-500 text-white border-none rounded cursor-pointer font-bold hover:bg-blue-600 transition-colors"
              @click="handleLocale"
            >
              🌍 Pobierz Locale (pl)
            </button>
          </div>

          <div
            class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5 col-span-1 md:col-span-2 flex flex-row gap-2.5 items-center flex-wrap"
          >
            <h2 class="text-xl font-semibold m-0 mr-auto">Wersje</h2>
            <button
              class="p-2.5 bg-blue-500 text-white border-none rounded cursor-pointer font-bold hover:bg-blue-600 transition-colors"
              @click="handleCurrentVersion"
            >
              🔢 Aktualna wersja
            </button>
            <button
              class="p-2.5 bg-blue-500 text-white border-none rounded cursor-pointer font-bold hover:bg-blue-600 transition-colors"
              @click="handleAvailableVersions"
            >
              📋 Dostępne wersje
            </button>
            <button
              class="p-2.5 bg-blue-500 text-white border-none rounded cursor-pointer font-bold hover:bg-blue-600 transition-colors"
              @click="handleVersionStatus"
            >
              ✅ Status wersji
            </button>
          </div>
        </div>

        <div class="flex-1 flex flex-col min-w-[350px] min-h-0">
          <div
            class="bg-black border border-[#333] rounded-lg p-5 flex flex-col h-full min-h-0 box-border"
          >
            <h2 class="text-xl font-semibold mt-0 mb-2 shrink-0">Wynik z Electrona:</h2>
            <div
              class="grow overflow-y-auto bg-[#0a0a0a] rounded p-4 border border-[#222] custom-scrollbar"
            >
              <pre class="text-[#a6e22e] whitespace-pre-wrap break-words m-0 font-mono text-sm">{{
                outputLog || 'Czekam na akcję...'
              }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore } from '@renderer/stores/settingsStore'
import BuLanguageSelector from './BuLanguageSelector.vue'

// UWAGA: Upewnij się, że ścieżka do UserResponseSchema jest poprawna.
// Na podstawie wklejki z typami IPC, plik ze schematem to prawdopodobnie to:
import type { UserResponseSchema } from '@shared/schemas/user'

const settingsStore = useSettingsStore()

const registerForm = ref({
  nickname: 'testuser',
  email: 'test@example.com',
  password: '#Pracownia123',
  passwordConfirm: '#Pracownia123'
})

const loginForm = ref({
  email: 'test@example.com',
  password: '#Pracownia123'
})

const outputLog = ref<unknown | string | null>(null)
const isDraggingOver = ref(false)

// Nowy stan dla aktualnego usera
const currentUser = ref<UserResponseSchema | null>(null)

const logResult = (_actionName: string, response: unknown): void => {
  outputLog.value = response
}

// Generowanie URL avatara na podstawie id usera
const getAvatarUrl = (
  avatarId: string,
  size: '128' | '256' | '512' | 'original' = '128'
): string => {
  const url = `http://localhost/avatar/${avatarId}/${size}.webp`
  console.log(`[getAvatarUrl] Generated URL for avatarId "${avatarId}" and size "${size}": ${url}`)
  return url
}

const handleRegister = async (): Promise<void> => {
  outputLog.value = 'Ładowanie...'
  const res = await window.api.auth.register({ ...registerForm.value })
  logResult('REGISTER', res)
}

const handleLogin = async (): Promise<void> => {
  outputLog.value = 'Ładowanie...'
  const res = await window.api.auth.login({ ...loginForm.value })
  logResult('LOGIN', res)
}

const handleGetMe = async (): Promise<void> => {
  outputLog.value = 'Ładowanie...'
  const res = await window.api.auth.getMe()
  logResult('GET_ME', res)
}

const handleLogout = async (): Promise<void> => {
  outputLog.value = 'Ładowanie...'
  const res = await window.api.auth.logout()
  logResult('LOGOUT', res)
  currentUser.value = null // Czyścimy profil po wylogowaniu na frontendzie
}

// Nowy handler do pobierania profilu aktualnego usera
const handleGetCurrentUser = async (): Promise<void> => {
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

const handleUploadAvatar = async (): Promise<void> => {
  outputLog.value = 'Oczekiwanie na wybór pliku...'
  try {
    const res = await window.api.users.uploadAvatar(null)
    logResult('UPLOAD_AVATAR_DIALOG', res)
  } catch (e) {
    logResult('UPLOAD_AVATAR_DIALOG_ERROR', e)
  }
}

const onDragOver = (): void => {
  isDraggingOver.value = true
}
const onDragLeave = (): void => {
  isDraggingOver.value = false
}

const onDrop = async (event: DragEvent): Promise<void> => {
  isDraggingOver.value = false
  outputLog.value = 'Czytanie pliku do pamięci...'

  const files = event.dataTransfer?.files
  if (!files || files.length === 0) {
    logResult('DROP_ERROR', 'Nie znaleziono plików.')
    return
  }

  const file = files[0]
  if (!file.type.startsWith('image/')) {
    logResult('DROP_ERROR', 'To nie jest plik obrazu!')
    return
  }

  try {
    const testUserId = null

    const arrayBuffer = await file.arrayBuffer()

    const res = await window.api.users.uploadAvatarByBuffer(
      arrayBuffer,
      file.name,
      file.type,
      testUserId
    )

    logResult('UPLOAD_AVATAR_DROP', res)
  } catch (e) {
    logResult('UPLOAD_AVATAR_DROP_ERROR', e)
  }
}

const handleSupportedVersions = async (): Promise<void> => {
  outputLog.value = 'Ładowanie...'
  try {
    const res = await window.api.core.getSupportedVersions()
    logResult('SUPPORTED_VERSIONS', res)
  } catch (e) {
    logResult('SUPPORTED_VERSIONS_ERROR', e)
  }
}

const handleLanguages = async (): Promise<void> => {
  outputLog.value = 'Ładowanie...'
  try {
    const res = await window.api.core.getAvailableLanguages()
    logResult('LANGUAGES', res)
  } catch (e) {
    logResult('LANGUAGES_ERROR', e)
  }
}

const handleLocale = async (): Promise<void> => {
  outputLog.value = 'Ładowanie...'
  try {
    const res = await window.api.core.getLocale('en')
    logResult('LOCALE', res)
  } catch (e) {
    logResult('LOCALE_ERROR', e)
  }
}

const handleCurrentVersion = async (): Promise<void> => {
  outputLog.value = 'Ładowanie...'
  try {
    const res = await settingsStore.getCurrentVersion()
    logResult('CURRENT_VERSION', res)
  } catch (e) {
    logResult('CURRENT_VERSION_ERROR', e)
  }
}

const handleAvailableVersions = async (): Promise<void> => {
  outputLog.value = 'Ładowanie...'
  try {
    await settingsStore.fetchSupportedVersions()
    logResult('AVAILABLE_VERSIONS', settingsStore.supportedVersions)
  } catch (e) {
    logResult('AVAILABLE_VERSIONS_ERROR', e)
  }
}

const handleVersionStatus = async (): Promise<void> => {
  outputLog.value = 'Ładowanie...'
  try {
    const res = await settingsStore.checkVersionStatus()
    logResult('VERSION_STATUS', res)
  } catch (e) {
    logResult('VERSION_STATUS_ERROR', e)
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
