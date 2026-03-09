<template>
  <div class="home-page">
    <HostForm />
  </div>
    <!-- <router-link to="/about">Przejdź do About</router-link> -->
</template>

<script setup lang="ts">
import HostForm from '@renderer/components/forms/HostForm.vue'
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
