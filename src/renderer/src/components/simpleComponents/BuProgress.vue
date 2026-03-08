<template>
  <UProgress
    v-if="type === 'progress'"
    :model-value="props.modelValue"
    :max="max"
    :ui="{
      indicator: 'bg-[#A749FC]',
      base: 'bg-[#37363F]'
    }"
    animation="null"
    color="primary"
  />
  <UProgress
    v-if="type === 'strong'"
    :model-value="props.modelValue"
    :max="max"
    :color="props.modelValue <= 2 ? 'error' : props.modelValue <= 4 ? 'warning' : 'success'"
    animation="null"
  />
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue'

const props = defineProps({
  type: {
    type: String as PropType<'strong' | 'progress'>,
    default: 'progress'
  },
  modelValue: {
    type: Number,
    default: 0
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
