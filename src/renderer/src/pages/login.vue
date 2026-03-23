<template>
  <section class="login-page">
    <div class="login-card">
      <h1 class="login-title">{{ $t('login.title') }}</h1>
      <LoginForm />
    </div>
  </section>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.login-card {
  width: min(460px, 100%);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-title {
  text-align: center;
  font-size: 28px;
  font-weight: 700;
}
</style>
