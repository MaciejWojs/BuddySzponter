<template>
  <!-- Widok rejestracji: renderuje formularz zakładania nowego konta użytkownika. -->
  <section class="register-page">
    <div class="register-card">
      <h1 class="register-title">{{ $t('login.register') }}</h1>
      <RegisterForm />
    </div>
  </section>
</template>

<script setup lang="ts">
// Logika widoku rejestracji: import i osadzenie dedykowanego formularza rejestracji.
import RegisterForm from '../components/forms/RegisterForm.vue'
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.register-card {
  width: min(460px, 100%);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.register-title {
  text-align: center;
  font-size: 28px;
  font-weight: 700;
}
</style>
