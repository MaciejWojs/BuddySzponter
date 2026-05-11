<template>
  <section
    class="flex h-full min-h-0 flex-col rounded-2xl border border-[#8c67c6] bg-[#6d4ea8] shadow-[0_16px_36px_rgba(0,0,0,0.35)]"
    :class="panelClass"
  >
    <ChatHeader @close="$emit('close')" @set-download-folder="handleSetDownloadFolder" />

    <ChatMessagesList
      ref="messagesListRef"
      :messages="chatMessages"
      :local-author-id="localAuthorId"
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

    <ChatComposer :disabled="attachDisabled" @send="handleSend" @attach="handleAttachFiles" />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useChatChannel } from '@renderer/composables/channels/ChatChannel'
import { setPreferredDownloadDirectory } from '@renderer/composables/channels/FileTransferChannel'
import { chatService } from '@renderer/services/chatService'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { useHidChannel } from '@renderer/composables/channels/HidChannel'
import ChatComposer from '@renderer/components/chat/ChatComposer.vue'
import ChatHeader from '@renderer/components/chat/ChatHeader.vue'
import ChatMessagesList from '@renderer/components/chat/ChatMessagesList.vue'

interface ChatMessagesListExpose {
  scrollToBottom: () => void
}

withDefaults(
  defineProps<{
    panelClass?: string
  }>(),
  {
    panelClass: ''
  }
)

defineEmits<{
  close: []
}>()

useChatChannel()

const webRtcStore = useWebRtcStore()
const hid = useHidChannel()

const attachDisabled = computed(
  () =>
    webRtcStore.rtcStatus !== 'connected' ||
    !hid.isControlGranted.value ||
    !window.api?.fileTransfer?.pickFiles
)

const chatMessages = chatService.messages
const localAuthorId = chatService.localAuthorId

const editingMessageId = ref<string | null>(null)
const editingText = ref('')
const openActionsId = ref<string | null>(null)

const messagesListRef = ref<ChatMessagesListExpose | null>(null)

const scrollToBottom = async (): Promise<void> => {
  await nextTick()
  messagesListRef.value?.scrollToBottom()
}

onMounted(async () => {
  await chatService.refreshLocalSenderName()
  await scrollToBottom()
})

watch(
  () => chatMessages.value.length,
  () => {
    void scrollToBottom()
  }
)

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

const handleSend = async (text: string): Promise<void> => {
  await chatService.sendMessage(text)
}

const handleAttachFiles = async (): Promise<void> => {
  if (attachDisabled.value) return
  const paths = await window.api.fileTransfer.pickFiles()
  if (!paths?.length) return
  await chatService.sendFilesWithPaths(paths)
}

const handleSetDownloadFolder = async (): Promise<void> => {
  await setPreferredDownloadDirectory()
}

const saveEdit = async (id: string): Promise<void> => {
  const success = await chatService.editMessage(id, editingText.value)
  if (!success) return

  cancelEdit()
}

const handleDelete = async (id: string): Promise<void> => {
  await chatService.deleteMessage(id)
  openActionsId.value = null
}
</script>
