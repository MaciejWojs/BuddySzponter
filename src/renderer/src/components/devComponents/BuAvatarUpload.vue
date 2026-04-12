<template>
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
      <p v-else class="m-0 mr-auto text-[#42b883] font-bold text-lg animate-pulse">UPUŚĆ TERAZ!</p>
      <button
        class="p-2.5 bg-blue-500 text-white border-none rounded cursor-pointer font-bold hover:bg-blue-600 transition-colors"
        @click="handleUploadAvatar"
      >
        🖼️ Wybierz plik
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ (e: 'log-result', action: string, data: unknown): void }>()
const isDraggingOver = ref(false)

const onDragOver = (): void => {
  isDraggingOver.value = true
}
const onDragLeave = (): void => {
  isDraggingOver.value = false
}

const handleUploadAvatar = async (): Promise<void> => {
  emit('log-result', 'UPLOAD_AVATAR_DIALOG', 'Oczekiwanie na wybór pliku...')
  try {
    const res = await window.api.users.uploadAvatar(null)
    emit('log-result', 'UPLOAD_AVATAR_DIALOG', res)
  } catch (e) {
    emit('log-result', 'UPLOAD_AVATAR_DIALOG_ERROR', e)
  }
}

const onDrop = async (event: DragEvent): Promise<void> => {
  isDraggingOver.value = false
  emit('log-result', 'UPLOAD_AVATAR_DROP', 'Czytanie pliku do pamięci...')

  const files = event.dataTransfer?.files
  if (!files || files.length === 0)
    return emit('log-result', 'DROP_ERROR', 'Nie znaleziono plików.')

  const file = files[0]
  if (!file.type.startsWith('image/'))
    return emit('log-result', 'DROP_ERROR', 'To nie jest plik obrazu!')

  try {
    const arrayBuffer = await file.arrayBuffer()
    const res = await window.api.users.uploadAvatarByBuffer(arrayBuffer, file.name, file.type)
    emit('log-result', 'UPLOAD_AVATAR_DROP', res)
  } catch (e) {
    emit('log-result', 'UPLOAD_AVATAR_DROP_ERROR', e)
  }
}
</script>
