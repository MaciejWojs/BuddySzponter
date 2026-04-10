<script setup lang="ts">
import { useRouter } from 'vue-router'
import RegisterForm from '../components/forms/RegisterForm.vue'

const router = useRouter()

function goToMenu(): void {
  void router.push('/Menu')
}
</script>

<template>
  <!-- Widok rejestracji: renderuje formularz zakładania nowego konta użytkownika. -->
  <section class="register-page">
    <div class="register-card">
      <div class="register-header">
        <button class="back-arrow" :aria-label="$t('login.backToMenu')" @click="goToMenu">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 class="register-title">{{ $t('login.registerb') }}</h1>
      </div>
      <RegisterForm />
    </div>
  </section>
</template>

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

.register-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-arrow {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0 4px 0 0;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.back-arrow:hover {
  color: #b794f4;
}

.register-title {
  text-align: center;
  font-size: 28px;
  font-weight: 700;
}
</style>
