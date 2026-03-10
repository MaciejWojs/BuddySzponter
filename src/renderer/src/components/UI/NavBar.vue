<template>
  <nav class="navbar">
    <component
      :is="item.component"
      v-for="item in items"
      :key="item.name"
      :size="item.size"
      :active="modelValue === item.name"
      @click="emit('update:modelValue', item.name)"
    />
  </nav>
</template>

<script lang="ts">
import type { Component } from 'vue'

export interface NavBarItem {
  name: string
  component: Component
  size?: number
}
</script>

<script setup lang="ts">
defineProps<{
  items: NavBarItem[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px;
}
</style>
