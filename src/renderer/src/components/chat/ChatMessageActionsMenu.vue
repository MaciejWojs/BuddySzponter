<template>
  <div
    v-if="visible"
    class="absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 overflow-hidden rounded-md bg-black text-white shadow-lg"
  >
    <button
      type="button"
      class="block w-full px-5 py-2 text-center text-sm transition hover:bg-white/10"
      @click="$emit('delete')"
    >
      usuń
    </button>
    <button
      type="button"
      class="block w-full px-5 py-2 text-center text-sm transition hover:bg-white/10"
      @click="$emit('edit')"
    >
      edytuj
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

defineEmits<{
  delete: []
  edit: []
}>()
</script>
