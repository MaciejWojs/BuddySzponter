<template>
  <!-- Sekcja widoku komponentu NavBar: definiuje strukturę renderowaną w interfejsie użytkownika. -->
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
// Sekcja logiki komponentu NavBar: zarządza danymi, zdarzeniami i zachowaniem widoku.
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
  padding: 14px 12px 8px;
  min-height: 56px;
  overflow: visible;
}

.navbar :deep(button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  line-height: 0;
  min-height: 40px;
  overflow: visible;
}

.navbar :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 40px;
  max-height: 40px;
  object-fit: contain;
  margin: auto;
  overflow: visible;
}
</style>
