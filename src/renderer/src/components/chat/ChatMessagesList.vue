<template>
  <section ref="scrollContainer" class="min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-3">
    <div class="flex flex-col gap-3">
      <ChatMessageItem
        v-for="(message, index) in messages"
        :key="message.id"
        :message="message"
        :is-own="message.authorId === localAuthorId"
        :show-sender-label="shouldShowSenderLabel(index)"
        :is-editing="editingMessageId === message.id"
        :is-actions-open="openActionsId === message.id"
        :editing-text="editingText"
        @toggle-actions="$emit('toggleActions', $event)"
        @start-edit="$emit('startEdit', $event)"
        @update-editing-text="$emit('updateEditingText', $event)"
        @save-edit="$emit('saveEdit', $event)"
        @cancel-edit="$emit('cancelEdit')"
        @delete="$emit('delete', $event)"
      />

      <div v-if="messages.length === 0" class="pt-4 text-center text-sm text-white/75">
        Brak wiadomości...
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ChatMessage } from '@renderer/services/chatService'
import ChatMessageItem from '@renderer/components/chat/ChatMessageItem.vue'

const props = defineProps<{
  messages: ChatMessage[]
  localAuthorId: string
  editingMessageId: string | null
  editingText: string
  openActionsId: string | null
}>()

defineEmits<{
  toggleActions: [id: string]
  startEdit: [payload: { id: string; text: string }]
  updateEditingText: [value: string]
  saveEdit: [id: string]
  cancelEdit: []
  delete: [id: string]
}>()

const scrollContainer = ref<HTMLElement | null>(null)

const scrollToBottom = (): void => {
  if (!scrollContainer.value) return
  scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
}

const shouldShowSenderLabel = (index: number): boolean => {
  if (index <= 0) return true
  const current = props.messages[index]
  const previous = props.messages[index - 1]
  if (!current || !previous) return true

  return current.authorId !== previous.authorId
}

defineExpose({
  scrollToBottom
})
</script>
