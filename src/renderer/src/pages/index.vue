<template>
  <div class="home-page">
      <LoginForm />
  </div>
    <!-- <router-link to="/about">Przejdź do About</router-link> -->
</template>

<script setup lang="ts">
import LoginForm from '@renderer/components/LoginForm.vue';

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
