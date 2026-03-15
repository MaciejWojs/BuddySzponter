<template>
  <div class="home-page dark-theme">
    <header>
      <h1>🧪 Panel Testowy API (Auth)</h1>
    </header>

    <div class="layout-wrapper">
      <div class="forms-section">
        <div class="card dark-card">
          <h2>Rejestracja</h2>
          <form @submit.prevent="handleRegister">
            <input
              v-model="registerForm.nickname"
              type="text"
              placeholder="Nickname (min 3 znaki)"
              required
            />
            <input v-model="registerForm.email" type="email" placeholder="Email" required />
            <input
              v-model="registerForm.password"
              type="password"
              placeholder="Hasło (min 8 znaków)"
              required
            />
            <input
              v-model="registerForm.passwordConfirm"
              type="password"
              placeholder="Powtórz hasło"
              required
            />
            <button type="submit">Zarejestruj</button>
          </form>
        </div>

        <div class="card dark-card">
          <h2>Logowanie</h2>
          <form @submit.prevent="handleLogin">
            <input v-model="loginForm.email" type="email" placeholder="Email" required />
            <input v-model="loginForm.password" type="password" placeholder="Hasło" required />
            <button type="submit">Zaloguj</button>
          </form>
        </div>

        <div class="card dark-card actions-card">
          <h2>Akcje Sesji</h2>
          <p>Przetestuj z tokenem i bez tokena:</p>
          <button class="action-btn" @click="handleGetMe">🔍 Pobierz Profil (/me)</button>
          <button class="action-btn danger" @click="handleLogout">🚪 Wyloguj</button>
        </div>
      </div>

      <div class="console-section">
        <div class="card console-card">
          <h2>Wynik z Electrona:</h2>
          <div class="console-scroll-area">
            <pre class="console-output">{{ outputLog || 'Czekam na akcję...' }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// --- STANY FORMULARZY Z GOTOWYMI DANYMI TESTOWYMI ---
const registerForm = ref({
  nickname: 'testuser',
  email: 'test@example.com',
  password: 'Pass123!',
  passwordConfirm: 'Pass123!'
})

const loginForm = ref({
  email: 'test@example.com',
  password: 'Pass123!'
})

interface OutputLog {
  action: string
  timestamp: string
  response: unknown
}
const outputLog = ref<OutputLog | string | null>(null)

// --- FUNKCJA POMOCNICZA DO WYŚWIETLANIA WYNIKÓW ---
const logResult = (actionName: string, response: unknown): void => {
  outputLog.value = {
    action: actionName,
    timestamp: new Date().toLocaleTimeString(),
    response: response
  }
}

// --- HANDLERY API (Jawnie otypowane Promise<void>) ---
const handleRegister = async (): Promise<void> => {
  outputLog.value = 'Ładowanie...'
  const res = await window.api.auth.register({
    nickname: registerForm.value.nickname,
    email: registerForm.value.email,
    password: registerForm.value.password,
    passwordConfirm: registerForm.value.passwordConfirm
  })
  logResult('REGISTER', res)
}

const handleLogin = async (): Promise<void> => {
  outputLog.value = 'Ładowanie...'
  const res = await window.api.auth.login({
    email: loginForm.value.email,
    password: loginForm.value.password
  })
  logResult('LOGIN', res)
}

const handleGetMe = async (): Promise<void> => {
  outputLog.value = 'Ładowanie...'
  const res = await window.api.auth.getMe()
  logResult('GET_ME', res)
}

const handleLogout = async (): Promise<void> => {
  outputLog.value = 'Ładowanie...'
  const res = await window.api.auth.logout()
  logResult('LOGOUT', res)
}
</script>

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

header {
  margin-bottom: 20px;
  border-bottom: 2px solid #333;
  padding-bottom: 10px;
  flex-shrink: 0;
}

h1,
h2 {
  color: #e0e0e0;
  margin-top: 0;
}

/* Nowy układ dwukolumnowy */
.layout-wrapper {
  display: flex;
  gap: 20px;
  flex-grow: 1;
  min-height: 0; /* Ważne, żeby scroll działał wewnątrz divów */
}

/* Lewa kolumna (Formularze) */
.forms-section {
  flex: 1.2;
  display: grid;
  grid-template-columns: 1fr 1fr; /* Dwa formularze obok siebie */
  gap: 20px;
  align-content: start;
  overflow-y: auto;
  padding-right: 10px;
}

/* Prawa kolumna (Konsola) */
.console-section {
  flex: 1; /* Zajmuje trochę mniej miejsca niż formularze */
  display: flex;
  flex-direction: column;
  min-width: 350px;
}

/* Karty */
.card.dark-card {
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 20px;
}

/* Karta z akcjami musi rozciągać się na dwie kolumny w sekcji formularzy */
.actions-card {
  grid-column: span 2;
  display: flex;
  flex-direction: row; /* Przyciski obok siebie */
  gap: 10px;
  align-items: center;
}
.actions-card p {
  margin: 0;
  margin-right: auto;
}

/* Karta Konsoli */
.console-card {
  background: #000;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
}

/* To tu dzieje się magia przewijania logów */
.console-scroll-area {
  flex-grow: 1;
  overflow-y: auto;
  background: #0a0a0a;
  border-radius: 4px;
  padding: 15px;
  border: 1px solid #222;
  margin-top: 10px;
}

.console-output {
  color: #a6e22e; /* Kolor hakerski :) */
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  font-family: monospace;
}

/* Inputy i Przyciski */
form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

input {
  padding: 10px;
  border: 1px solid #444;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.05);
  color: #e0e0e0;
}
input:focus {
  outline: none;
  border-color: #42b883;
}

button {
  padding: 10px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
button:hover {
  background: #33a06f;
}

.action-btn {
  background: #3b82f6;
}
.action-btn:hover {
  background: #2563eb;
}

.danger {
  background: #ef4444;
}
.danger:hover {
  background: #dc2626;
}
</style>
