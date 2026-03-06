<template>
  <UProgress
    v-if="type === 'progress'"
    :model-value="value"
    :max="max"
    :ui="{
      indicator: 'bg-[#A749FC]',
      base: 'bg-[#ffffff]'
    }"
    animation="null"
    color="primary"
  />
  <UProgress
    v-if="type === 'strong'"
    :model-value="value"
    :max="max"
    :color="value <= 2 ? 'error' : value <= 4 ? 'warning' : 'success'"
    animation="null"
  />
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue'

const value = defineModel<number>({ default: 0 })

const props = defineProps({
  type: {
    type: String as PropType<'strong' | 'progress'>,
    default: 'progress'
  },
  steps: {
    type: Number,
    default: 100
  }
})

const max = computed(() => (props.type === 'strong' ? 5 : props.steps))
</script>

<style scoped>
div div {
  color: blue;
}
</style>
