<template>
  <div class="home-page">
    <Menu />
  </div>
</template>

<script setup lang="ts">
import Menu from './Menu.vue'
</script>

<style scoped>
/* Reset i g艂贸wny kontener na ca艂y ekran */
.home-page.dark-theme {
  padding: 20px;
  font-family: sans-serif;
  max-width: 1400px;
  margin: 0 auto;
  background-color: #121212;
  color: #e0e0e0;
  height: 100vh; /* Zajmuje ca艂膮 wysoko艣膰 okna */
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

/* Nowy uk艂ad dwukolumnowy */
.layout-wrapper {
  display: flex;
  gap: 20px;
  flex-grow: 1;
  min-height: 0; /* Wa偶ne, 偶eby scroll dzia艂a艂 wewn膮trz div贸w */
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
  flex: 1; /* Zajmuje troch臋 mniej miejsca ni偶 formularze */
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

/* Karta z akcjami musi rozci膮ga膰 si臋 na dwie kolumny w sekcji formularzy */
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

/* To tu dzieje si臋 magia przewijania log贸w */
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
