import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { chatService, type ChatMessage } from '@renderer/services/chatService'

const CHANNEL_NAME = 'host-chat-port'

type Mode = 'main' | 'portal'

interface SyncMessagesPayload {
  messages: ChatMessage[]
  localAuthorId: string
  localSenderName: string
  hasUnread: boolean
}

interface PortalChannelMessage {
  type:
    | 'REQUEST_STATE'
    | 'SYNC_MESSAGES'
    | 'ACTION_SEND_TEXT'
    | 'ACTION_SEND_FILES'
    | 'ACTION_EDIT'
    | 'ACTION_DELETE'
    | 'ACTION_MARK_READ'
  payload?: unknown
}

export interface HostChatPortalState {
  messages: Ref<ChatMessage[]>
  localAuthorId: Ref<string>
  localSenderName: Ref<string>
  sendText: (text: string) => void
  sendFiles: (paths: string[]) => void
  editMessage: (id: string, text: string) => void
  deleteMessage: (id: string) => void
  markConversationRead: () => void
}

export function useHostChatPortalSync(mode: 'main'): void
export function useHostChatPortalSync(mode: 'portal'): HostChatPortalState
export function useHostChatPortalSync(mode: Mode): HostChatPortalState | void {
  if (mode === 'main') {
    initMainBridge()
    return
  }

  return initPortal()
}

function initMainBridge(): void {
  let channel: BroadcastChannel | null = null

  onMounted(() => {
    channel = new BroadcastChannel(CHANNEL_NAME)

    const buildSyncPayload = (): SyncMessagesPayload => ({
      messages: chatService.messages.value.map((msg) => ({ ...msg })),
      localAuthorId: chatService.localAuthorId.value,
      localSenderName: chatService.localSenderName.value,
      hasUnread: chatService.hasUnread.value
    })

    const pushSync = (): void => {
      channel?.postMessage({ type: 'SYNC_MESSAGES', payload: buildSyncPayload() })
    }

    channel.onmessage = (event: MessageEvent<PortalChannelMessage>) => {
      const { type, payload } = event.data

      switch (type) {
        case 'REQUEST_STATE':
          pushSync()
          break
        case 'ACTION_SEND_TEXT':
          void chatService.sendMessage(payload as string)
          break
        case 'ACTION_SEND_FILES': {
          const paths = (payload as { paths?: string[] })?.paths
          if (Array.isArray(paths) && paths.length) {
            void chatService.sendFilesWithPaths(paths)
          }
          break
        }
        case 'ACTION_EDIT': {
          const data = payload as { id: string; text: string }
          void chatService.editMessage(data.id, data.text)
          break
        }
        case 'ACTION_DELETE':
          void chatService.deleteMessage(payload as string)
          break
        case 'ACTION_MARK_READ':
          chatService.markConversationRead()
          break
      }
    }

    watch(
      [
        () => chatService.messages.value.length,
        () => chatService.localSenderName.value,
        () => chatService.hasUnread.value,
        () =>
          chatService.messages.value
            .map(
              (m) =>
                `${m.id}:${m.text}:${m.updatedAt ?? 0}:${m.fileTransfer?.transferId ?? ''}:${m.fileTransfer?.files.map((f) => f.name).join(',') ?? ''}`
            )
            .join('|')
      ],
      () => pushSync()
    )
  })

  onUnmounted(() => {
    if (channel) channel.close()
  })
}

function initPortal(): HostChatPortalState {
  const messages = ref<ChatMessage[]>([])
  const localAuthorId = ref<string>('')
  const localSenderName = ref<string>('')

  let channel: BroadcastChannel | null = null

  const post = (message: PortalChannelMessage): void => {
    channel?.postMessage(message)
  }

  onMounted(() => {
    channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = (event: MessageEvent<PortalChannelMessage>) => {
      if (event.data.type !== 'SYNC_MESSAGES') return
      const data = event.data.payload as SyncMessagesPayload
      messages.value = data.messages
      localAuthorId.value = data.localAuthorId
      localSenderName.value = data.localSenderName
    }

    post({ type: 'REQUEST_STATE' })
  })

  onUnmounted(() => {
    if (channel) channel.close()
  })

  return {
    messages,
    localAuthorId,
    localSenderName,
    sendText: (text: string) => post({ type: 'ACTION_SEND_TEXT', payload: text }),
    sendFiles: (paths: string[]) => post({ type: 'ACTION_SEND_FILES', payload: { paths } }),
    editMessage: (id: string, text: string) => post({ type: 'ACTION_EDIT', payload: { id, text } }),
    deleteMessage: (id: string) => post({ type: 'ACTION_DELETE', payload: id }),
    markConversationRead: () => post({ type: 'ACTION_MARK_READ' })
  }
}
