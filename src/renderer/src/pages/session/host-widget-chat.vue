<template>
  <main class="chat-window" style="-webkit-app-region: drag">
    <header class="chat-header">
      <strong>Rozmowa</strong>
      <button
        type="button"
        class="chat-close"
        style="-webkit-app-region: no-drag"
        @click="closeChat"
      >
        Zamknij
      </button>
    </header>

    <section class="chat-messages" style="-webkit-app-region: no-drag">
      <p v-if="chatMessages.length === 0" class="chat-empty">Brak wiadomości</p>
      <p v-for="(msg, index) in chatMessages" :key="`${index}-${msg}`" class="chat-line">
        {{ msg }}
      </p>
    </section>

    <form class="chat-form" style="-webkit-app-region: no-drag" @submit.prevent="sendChatMessage">
      <input
        ref="chatInputRef"
        v-model="chatInput"
        type="text"
        class="chat-input"
        placeholder="Napisz wiadomość..."
      />
      <button type="submit" class="chat-send">Wyślij</button>
    </form>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useChatChannel } from '@renderer/composables/channels/ChatChannel'

const chatChannel = useChatChannel()
const chatMessages = computed(() => chatChannel.chatMessages.value)
const chatInput = ref('')
const chatInputRef = ref<HTMLInputElement | null>(null)

const sendChatMessage = (): void => {
  const text = chatInput.value.trim()
  if (!text) return

  chatChannel.sendChatMessage(text, 'Host')
  chatInput.value = ''
}

const closeChat = async (): Promise<void> => {
  try {
    await window.api.app.toggleHostWidgetChat()
  } catch (error) {
    console.error('Nie udało się zamknąć okna czatu widgetu:', error)
  }
}

onMounted(() => {
  void nextTick(() => chatInputRef.value?.focus())
})
</script>

<style scoped>
:global(html),
:global(body),
:global(#app) {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background: transparent;
  overflow: hidden;
}

.chat-window {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: linear-gradient(180deg, rgba(30, 22, 50, 0.97), rgba(20, 13, 36, 0.97));
  box-shadow: 0 18px 32px rgba(7, 5, 15, 0.5);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #f1e9ff;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
}

.chat-close {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: #d7cbff;
  border-radius: 8px;
  font-size: 11px;
  padding: 4px 8px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 8px;
}

.chat-empty {
  font-size: 11px;
  color: rgba(224, 214, 255, 0.6);
}

.chat-line {
  margin: 0 0 4px;
  font-size: 11px;
  color: #ece5ff;
  word-break: break-word;
}

.chat-form {
  display: flex;
  gap: 6px;
}

.chat-input {
  flex: 1;
  height: 34px;
  border-radius: 8px;
  border: 1px solid rgba(124, 228, 255, 0.6);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 0 9px;
  font-size: 12px;
}

.chat-input:focus {
  outline: none;
  border-color: rgba(124, 228, 255, 0.95);
}

.chat-send {
  height: 34px;
  border-radius: 8px;
  border: 1px solid rgba(124, 228, 255, 0.65);
  background: rgba(124, 228, 255, 0.18);
  color: #dff8ff;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
}
</style>
