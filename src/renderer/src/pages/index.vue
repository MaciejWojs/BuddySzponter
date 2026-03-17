<template>
  <div class="home-page dark-theme"></div>
</template>

<script setup lang="ts"></script>

<style scoped>
/* Reset i główny kontener na cały ekran */
.home-page.dark-theme {
  padding: 20px;
  font-family: sans-serif;
  max-width: 1400px;
  margin: 0 auto;
  background-color: #121212;
  color: #e0e0e0;
  height: 100vh; /* Zajmuje całą wysokość okna */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
</style>
