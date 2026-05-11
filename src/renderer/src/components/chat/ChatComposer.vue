<template>
  <form class="mt-3 px-2 pb-2" @submit.prevent="handleSubmit">
    <div class="flex items-center gap-2 rounded-2xl border border-[#d2a9ff] bg-[#b786ea] px-3 py-2">
      <input
        v-model="draft"
        type="text"
        placeholder="Napisz wiadomość..."
        class="min-w-0 flex-1 border-none bg-transparent text-sm text-white placeholder:text-white/80 outline-none"
      />

      <button
        type="submit"
        class="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/30"
      >
        Wyślij
      </button>

      <button
        type="button"
        :disabled="attachDisabled"
        class="inline-flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/20 disabled:opacity-40"
        title="Wyślij plik"
        @click="$emit('attach')"
      >
        <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5" aria-hidden="true">
          <path
            d="M9 11V5.5C9 3.57 10.57 2 12.5 2S16 3.57 16 5.5V15c0 1.38-1.12 2.5-2.5 2.5S11 16.38 11 15V8"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <button
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/20"
        @click="$emit('emojiClick')"
      >
        <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
          <circle cx="9" cy="10" r="1" fill="currentColor" />
          <circle cx="15" cy="10" r="1" fill="currentColor" />
          <path
            d="M8 14.2C8.9 15.5 10.3 16.2 12 16.2C13.7 16.2 15.1 15.5 16 14.2"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'

withDefaults(
  defineProps<{
    attachDisabled?: boolean
  }>(),
  {
    attachDisabled: false
  }
)

const emit = defineEmits<{
  send: [text: string]
  attach: []
  emojiClick: []
}>()

const draft = ref('')

const handleSubmit = (): void => {
  const normalized = draft.value.trim()
  if (!normalized) return

  emit('send', normalized)
  draft.value = ''
}
</script>
