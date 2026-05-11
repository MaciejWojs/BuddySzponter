<template>
  <div class="h-screen w-screen p-2">
    <HostChatPortalPanel
      :messages="state.messages.value"
      :local-author-id="state.localAuthorId.value"
      :on-send-text="state.sendText"
      :on-send-files="state.sendFiles"
      :on-edit-message="state.editMessage"
      :on-delete-message="state.deleteMessage"
      @close="closeWindow"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useHostChatPortalSync } from '@renderer/composables/syncWindow/useHostChatPortalSync'
import HostChatPortalPanel from '@renderer/components/chat/HostChatPortalPanel.vue'

const state = useHostChatPortalSync('portal')

const markRead = (): void => {
  if (document.visibilityState === 'visible') {
    state.markConversationRead()
  }
}

watch(
  () => state.messages.value.length,
  () => markRead()
)

onMounted(() => {
  document.addEventListener('visibilitychange', markRead)
  markRead()
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', markRead)
})

const closeWindow = (): void => {
  if (window.api?.app?.hideHostChatWindow) {
    window.api.app.hideHostChatWindow().catch(() => {})
  }
}
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
</style>
