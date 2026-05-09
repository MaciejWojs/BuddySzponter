<template>
  <article class="relative flex flex-col gap-1" :class="isOwn ? 'items-end' : 'items-start'">
    <ChatSenderLabel v-if="showSenderLabel" :text="message.sender" />

    <div class="relative max-w-[80%]">
      <ChatMessageBubble
        v-if="!isEditing"
        :text="message.text"
        :incoming="!isOwn"
        :show-edited="Boolean(message.updatedAt)"
        :clickable="isOwn"
        @click="$emit('toggleActions', message.id)"
      />

      <form
        v-else
        class="rounded-xl border px-4 py-2"
        :class="isOwn ? 'border-black/30 bg-[#f1f1f3]' : 'border-white/40 bg-black text-white'"
        @submit.prevent="$emit('saveEdit', message.id)"
      >
        <input
          :value="editingText"
          type="text"
          class="w-full border-none bg-transparent text-base outline-none"
          :class="isOwn ? 'text-[#111111]' : 'text-white'"
          @input="$emit('updateEditingText', ($event.target as HTMLInputElement).value)"
          @keydown.enter.prevent="$emit('saveEdit', message.id)"
          @keydown.esc.prevent="$emit('cancelEdit')"
        />
      </form>

      <ChatMessageActionsMenu
        :visible="isOwn && isActionsOpen && !isEditing"
        @edit="$emit('startEdit', { id: message.id, text: message.text })"
        @delete="$emit('delete', message.id)"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ChatMessage } from '@renderer/services/chatService'
import ChatMessageActionsMenu from '@renderer/components/chat/ChatMessageActionsMenu.vue'
import ChatMessageBubble from '@renderer/components/chat/ChatMessageBubble.vue'
import ChatSenderLabel from '@renderer/components/chat/ChatSenderLabel.vue'

defineProps<{
  message: ChatMessage
  isOwn: boolean
  showSenderLabel: boolean
  isEditing: boolean
  isActionsOpen: boolean
  editingText: string
}>()

defineEmits<{
  toggleActions: [id: string]
  startEdit: [payload: { id: string; text: string }]
  updateEditingText: [value: string]
  saveEdit: [id: string]
  cancelEdit: []
  delete: [id: string]
}>()
</script>
