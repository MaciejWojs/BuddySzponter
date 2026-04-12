<script setup lang="ts">
import { useRouter } from 'vue-router'
import buddySzponterLogo from '@images/buddyszponterLogo.png'
const router = useRouter()
function goToMenu(): void {
  void router.push('/Menu')
}
</script>

<template>
  <!-- Widok logowania: prezentuje kartę z formularzem autoryzacji użytkownika. -->
  <section class="login-page">
    <div class="login-card">
      <div class="login-header">
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
        <h1 class="login-title">{{ $t('login.title') }}</h1>
      </div>
      <LoginForm />
    </div>

    <footer class="login-footer">
      <img :src="buddySzponterLogo" :alt="$t('common.logoAlt')" class="menu-logo" />
    </footer>
  </section>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-rows: 1fr auto;
  padding: 24px 24px 16px;
}

.login-card {
  width: min(460px, 100%);
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-self: center;
  justify-self: center;
}

.login-header {
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

.login-title {
  text-align: center;
  font-size: 28px;
  font-weight: 700;
}

.login-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-bottom: 8px;
}

.menu-logo {
  width: 260px;
  max-width: 100%;
  height: auto;
}

@media (max-width: 1100px) {
  .menu-logo {
    width: 120px;
  }
}

@media (max-width: 600px) {
  .menu-logo {
    width: 80px;
  }
}
</style>
