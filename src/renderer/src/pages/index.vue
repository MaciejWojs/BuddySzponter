<template>
  <div class="home-page">
    <BuLanguageButton></BuLanguageButton>
    <Menu />
  </div>
</template>

<script setup lang="ts">
import Menu from './Menu.vue'
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
</style>
