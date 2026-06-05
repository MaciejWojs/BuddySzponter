<template>
  <article class="relative flex flex-col gap-1" :class="isOwn ? 'items-end' : 'items-start'">
    <ChatSenderLabel v-if="showSenderLabel" :text="message.sender" />

    <div class="relative max-w-[80%]">
      <ChatMessageBubble
        v-if="!isEditing && !message.fileTransfer"
        :text="message.text"
        :incoming="!isOwn"
        :show-edited="Boolean(message.updatedAt)"
        :clickable="isOwn"
        @click="$emit('toggleActions', message.id)"
      />

      <div
        v-else-if="!isEditing && message.fileTransfer"
        class="rounded-xl px-4 py-2 text-base shadow-sm transition"
        :class="[
          incoming ? 'bg-black text-white' : 'bg-[#f1f1f3] text-[#111111]',
          isOwn ? 'cursor-pointer hover:brightness-95' : ''
        ]"
        @click="onFileBoxClick"
      >
        <div class="text-xs font-semibold uppercase tracking-wide opacity-80">Pliki</div>
        <ul class="m-0 mt-1 list-none space-y-1 p-0">
          <li v-for="(f, idx) in message.fileTransfer.files" :key="idx" class="text-sm break-all">
            {{ f.name }}
            <span class="opacity-70">· {{ formatBytes(f.size) }}</span>
          </li>
        </ul>
      </div>

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
        :hide-edit="Boolean(message.fileTransfer)"
        @edit="$emit('startEdit', { id: message.id, text: message.text })"
        @delete="$emit('delete', message.id)"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatMessage } from '@renderer/services/chatService'
import ChatMessageActionsMenu from '@renderer/components/chat/ChatMessageActionsMenu.vue'
import ChatMessageBubble from '@renderer/components/chat/ChatMessageBubble.vue'
import ChatSenderLabel from '@renderer/components/chat/ChatSenderLabel.vue'

const props = defineProps<{
  message: ChatMessage
  isOwn: boolean
  showSenderLabel: boolean
  isEditing: boolean
  isActionsOpen: boolean
  editingText: string
}>()

const incoming = computed(() => !props.isOwn)

const emit = defineEmits<{
  toggleActions: [id: string]
  startEdit: [payload: { id: string; text: string }]
  updateEditingText: [value: string]
  saveEdit: [id: string]
  cancelEdit: []
  delete: [id: string]
}>()

const onFileBoxClick = (): void => {
  if (props.isOwn) emit('toggleActions', props.message.id)
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
</script>
