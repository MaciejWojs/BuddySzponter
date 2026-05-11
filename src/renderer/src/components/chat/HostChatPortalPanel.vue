<template>
  <section
    class="flex h-full min-h-0 flex-col rounded-2xl border border-[#8c67c6] bg-[#6d4ea8] shadow-[0_16px_36px_rgba(0,0,0,0.35)]"
  >
    <div class="flex items-center justify-between gap-3 px-1 py-1" style="-webkit-app-region: drag">
      <h3 class="m-0 px-3 text-base font-semibold text-white">Czat (Host)</h3>
      <button
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15"
        style="-webkit-app-region: no-drag"
        @click="$emit('close')"
      >
        <span class="text-2xl leading-none">&times;</span>
      </button>
    </div>

    <ChatMessagesList
      ref="messagesListRef"
      :messages="props.messages"
      :local-author-id="props.localAuthorId"
      :editing-message-id="editingMessageId"
      :editing-text="editingText"
      :open-actions-id="openActionsId"
      @toggle-actions="toggleActions"
      @start-edit="startEdit"
      @update-editing-text="updateEditingText"
      @save-edit="saveEdit"
      @cancel-edit="cancelEdit"
      @delete="handleDelete"
    />

    <ChatComposer :disabled="attachDisabled" @send="handleSend" @attach="handleAttach" />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { ChatMessage } from '@renderer/services/chatService'
import ChatComposer from '@renderer/components/chat/ChatComposer.vue'
import ChatMessagesList from '@renderer/components/chat/ChatMessagesList.vue'

interface ChatMessagesListExpose {
  scrollToBottom: () => void
}

const props = defineProps<{
  messages: ChatMessage[]
  localAuthorId: string
  onSendText: (text: string) => void
  onSendFiles: (paths: string[]) => void
  onEditMessage: (id: string, text: string) => void
  onDeleteMessage: (id: string) => void
}>()

const attachDisabled = computed(() => !window.api?.fileTransfer?.pickFiles)

defineEmits<{
  close: []
}>()

const editingMessageId = ref<string | null>(null)
const editingText = ref('')
const openActionsId = ref<string | null>(null)

const messagesListRef = ref<ChatMessagesListExpose | null>(null)

watch(
  () => props.messages,
  () => {
    void scrollToBottom()
  },
  { deep: true }
)

const scrollToBottom = async (): Promise<void> => {
  await nextTick()
  messagesListRef.value?.scrollToBottom()
}

const startEdit = ({ id, text }: { id: string; text: string }): void => {
  editingMessageId.value = id
  editingText.value = text
  openActionsId.value = null
}

const cancelEdit = (): void => {
  editingMessageId.value = null
  editingText.value = ''
}

const updateEditingText = (value: string): void => {
  editingText.value = value
}

const toggleActions = (id: string): void => {
  openActionsId.value = openActionsId.value === id ? null : id
}

const handleSend = (text: string): void => {
  props.onSendText(text)
}

const handleAttach = async (): Promise<void> => {
  if (attachDisabled.value) return
  const paths = await window.api.fileTransfer.pickFiles()
  if (!paths?.length) return
  props.onSendFiles(paths)
}

const saveEdit = (id: string): void => {
  const trimmed = editingText.value.trim()
  if (!trimmed) return
  props.onEditMessage(id, trimmed)
  cancelEdit()
}

const handleDelete = (id: string): void => {
  props.onDeleteMessage(id)
  openActionsId.value = null
}
</script>
