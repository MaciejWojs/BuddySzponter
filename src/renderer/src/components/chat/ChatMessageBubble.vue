<template>
  <div
    class="rounded-xl px-4 py-2 text-base shadow-sm transition"
    :class="[
      incoming ? 'bg-black text-white' : 'bg-[#f1f1f3] text-[#111111]',
      clickable ? 'cursor-pointer hover:brightness-95' : ''
    ]"
    @click="handleClick"
  >
    <span>{{ text }}</span>
    <span v-if="showEdited" class="ml-2 text-[11px] opacity-65">(edyt.)</span>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    text: string
    incoming: boolean
    showEdited?: boolean
    clickable?: boolean
  }>(),
  {
    showEdited: false,
    clickable: false
  }
)

const emit = defineEmits<{
  click: []
}>()

const handleClick = (): void => {
  if (!props.clickable) return
  emit('click')
}
</script>
