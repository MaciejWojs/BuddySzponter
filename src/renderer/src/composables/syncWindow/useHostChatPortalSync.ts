import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { chatService, type ChatMessage } from '@renderer/services/chatService'

function toPlainMessages(list: readonly ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = []
  for (const m of list) {
    if (!m || typeof m !== 'object') continue
    const plain: ChatMessage = {
      id: String(m.id ?? ''),
      text: String(m.text ?? ''),
      sender: String(m.sender ?? ''),
      authorId: String(m.authorId ?? ''),
      createdAt: typeof m.createdAt === 'number' ? m.createdAt : Date.now()
    }
    if (typeof m.updatedAt === 'number') plain.updatedAt = m.updatedAt
    if (m.fileTransfer && typeof m.fileTransfer === 'object') {
      const filesRaw = Array.isArray(m.fileTransfer.files) ? m.fileTransfer.files : []
      plain.fileTransfer = {
        transferId: String(m.fileTransfer.transferId ?? ''),
        files: filesRaw.map((f) => ({
          name: String(f?.name ?? ''),
          size: typeof f?.size === 'number' ? f.size : 0
        }))
      }
    }
    out.push(plain)
  }
  return out
}

function messagesFingerprint(list: readonly ChatMessage[]): string {
  let acc = ''
  for (const m of list) {
    if (!m) continue
    const ft = m.fileTransfer
    acc +=
      `${m.id}|${m.text}|${m.updatedAt ?? 0}|` +
      `${ft?.transferId ?? ''}|${(ft?.files ?? []).map((f) => `${f.name}:${f.size}`).join(',')}\n`
  }
  return acc
}

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
      messages: toPlainMessages(chatService.messages.value),
      localAuthorId: chatService.localAuthorId.value,
      localSenderName: chatService.localSenderName.value,
      hasUnread: chatService.hasUnread.value
    })

    const pushSync = (): void => {
      if (!channel) return
      const payload = buildSyncPayload()
      try {
        channel.postMessage({ type: 'SYNC_MESSAGES', payload })
      } catch (e) {
        console.warn('[host-chat-port] SYNC_MESSAGES postMessage failed', e)
        try {
          channel.postMessage({
            type: 'SYNC_MESSAGES',
            payload: JSON.parse(JSON.stringify(payload))
          })
        } catch (e2) {
          console.error('[host-chat-port] SYNC_MESSAGES fallback failed', e2)
        }
      }
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
        () => chatService.localAuthorId.value,
        () => chatService.hasUnread.value,
        () => messagesFingerprint(chatService.messages.value)
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
      messages.value = Array.isArray(data?.messages) ? data.messages : []
      localAuthorId.value =
        typeof data?.localAuthorId === 'string' ? data.localAuthorId : ''
      localSenderName.value =
        typeof data?.localSenderName === 'string' ? data.localSenderName : ''
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
