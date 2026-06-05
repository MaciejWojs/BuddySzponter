<template>
  <div
    class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5 col-span-1 md:col-span-2 flex flex-col gap-4"
  >
    <div class="flex flex-row gap-2.5 items-center justify-between border-b border-[#333] pb-3">
      <h2 class="text-xl font-semibold m-0">Twój Profil</h2>
      <button
        class="p-2.5 bg-purple-500 text-white border-none rounded cursor-pointer font-bold hover:bg-purple-600 transition-colors"
        @click="$emit('fetch-user')"
      >
        👤 Pobierz Aktualnego Usera
      </button>
    </div>

    <div v-if="user" class="flex items-center gap-5 p-3 bg-black/30 rounded-lg">
      <div
        class="relative w-24 h-24 shrink-0 rounded-full border-2 border-[#42b883] overflow-hidden bg-[#2a2a2a] flex items-center justify-center"
      >
        <img
          v-if="user.avatar"
          :src="getAvatarUrl(user.avatar, '256')"
          alt="User Avatar"
          class="w-full h-full object-cover"
        />
        <span v-else class="text-3xl text-gray-500">?</span>
      </div>

      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <span class="text-2xl font-bold text-[#e0e0e0]">{{ user.nickname }}</span>
          <span
            v-if="user.roleId"
            class="px-2 py-0.5 text-xs font-bold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30"
          >
            Rola: {{ user.roleId }}
          </span>
        </div>
        <span class="text-gray-400">{{ user.email }}</span>

        <div class="flex gap-2 mt-2 text-xs">
          <span
            v-if="user.isBanned"
            class="px-2 py-1 bg-red-500/20 text-red-400 rounded border border-red-500/30"
            >Zbanowany</span
          >
          <span
            v-if="user.isDeleted"
            class="px-2 py-1 bg-gray-500/20 text-gray-400 rounded border border-gray-500/30"
            >Usunięty</span
          >
          <span class="text-gray-500">ID: {{ user.id }}</span>
        </div>
      </div>
    </div>

    <div v-else class="text-center p-5 text-gray-500 border border-dashed border-[#444] rounded">
      Brak załadowanych danych. Kliknij przycisk powyżej lub zaloguj się.
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserResponseSchema } from '@shared/schemas/user'

defineProps<{ user: UserResponseSchema | null }>()
defineEmits<{ (e: 'fetch-user'): void }>()

const getAvatarUrl = (
  avatarId: string,
  size: '128' | '256' | '512' | 'original' = '128'
): string => {
  return `${import.meta.env.VITE_PHOTOS_BASE_URL}/avatar/${avatarId}/${size}.webp`
}
</script>
