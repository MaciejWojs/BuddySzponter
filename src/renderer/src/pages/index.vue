<template>
  <div class="home-page">
    <h1>Witaj w mojej aplikacji Electron + Vue!</h1>
    <p>To jest strona główna, wygenerowana automatycznie przez file-based routing.</p>
    <p> {{ $t('message.hello') }}</p>

    <nav>
      <router-link to="/about">Przejdź do About</router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">

// const message = ref('Kliknij link, aby przejść do innej strony')
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 50px;
  font-family: Arial, sans-serif;
}

nav {
  margin-top: 20px;
}

a {
  text-decoration: none;
  color: #42b983;
}

a:hover {
  text-decoration: underline;
}
</style>