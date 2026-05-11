<template>
  <form class="mt-2 flex w-full max-w-[80%] gap-2" @submit.prevent="$emit('save')">
    <input
      :value="modelValue"
      type="text"
      class="min-w-0 flex-1 rounded-md border border-white/35 bg-black/50 px-3 py-2 text-sm text-black outline-none transition focus:border-white/80"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      type="submit"
      class="rounded-md bg-white/25 px-3 py-2 text-xs font-semibold text-black transition hover:bg-white/35"
    >
      Zapisz
    </button>
    <button
      type="button"
      class="rounded-md bg-black/35 px-3 py-2 text-xs font-semibold text-black transition hover:bg-black/50"
      @click="$emit('cancel')"
    >
      Anuluj
    </button>
  </form>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
  save: []
  cancel: []
}>()
</script>
