import { computed, ref, watch, type ComputedRef } from 'vue'
import type { P2PMessage } from '@renderer/schemas/p2pProtocol'
import { useUserStore } from '@renderer/stores/userStore'
import { requestOutgoingFileTransferFromPaths } from '@renderer/composables/channels/FileTransferChannel'

export type ChatPayload = Extract<P2PMessage, { type: 'CHAT' }>['payload']
type ChatCreatePayload = Extract<ChatPayload, { op: 'create' }>
type ChatEditPayload = Extract<ChatPayload, { op: 'edit' }>
type ChatDeletePayload = Extract<ChatPayload, { op: 'delete' }>
type ChatFilePayload = Extract<ChatPayload, { op: 'file' }>

export interface ChatMessage {
  id: string
  text: string
  sender: string
  authorId: string
  createdAt: number
  updatedAt?: number
  fileTransfer?: {
    transferId: string
    files: { name: string; size: number }[]
  }
}

type ChatTransportSender = (payload: ChatPayload) => void
type LegacyChatPayload = {
  text: string
  sender: string
}

const FALLBACK_SENDER_NAME = 'Guest'

const messages = ref<ChatMessage[]>([])
const localSenderName = ref<string>(FALLBACK_SENDER_NAME)
const localAuthorId = ref<string>(crypto.randomUUID())
const lastReadAt = ref<number>(Date.now())

const hasUnread: ComputedRef<boolean> = computed(() =>
  messages.value.some(
    (message) => message.authorId !== localAuthorId.value && message.createdAt > lastReadAt.value
  )
)

const markConversationRead = (): void => {
  const latestForeign = messages.value.reduce<number>((acc, message) => {
    if (message.authorId === localAuthorId.value) return acc
    return message.createdAt > acc ? message.createdAt : acc
  }, 0)
  lastReadAt.value = Math.max(lastReadAt.value, latestForeign, Date.now())
}

let isSenderSyncInitialized = false
let senderRefreshPromise: Promise<string> | null = null
let sendTransport: ChatTransportSender = () => undefined

const applyCreate = (payload: ChatCreatePayload): void => {
  const exists = messages.value.some((message) => message.id === payload.id)
  if (exists) return

  messages.value.push({
    id: payload.id,
    text: payload.text,
    sender: payload.sender,
    authorId: payload.authorId,
    createdAt: payload.at
  })
}

const applyEdit = (payload: ChatEditPayload): void => {
  const message = messages.value.find((item) => item.id === payload.id)
  if (!message) return

  message.text = payload.text
  message.updatedAt = payload.at
}

const applyDelete = (payload: ChatDeletePayload): void => {
  messages.value = messages.value.filter((message) => message.id !== payload.id)
}

const applyFile = (payload: ChatFilePayload): void => {
  const exists = messages.value.some((message) => message.id === payload.id)
  if (exists) return

  const summary =
    payload.files.length === 1
      ? payload.files[0]!.name
      : `${payload.files.length} plików: ${payload.files.map((f) => f.name).join(', ')}`

  messages.value.push({
    id: payload.id,
    text: summary,
    sender: payload.sender,
    authorId: payload.authorId,
    createdAt: payload.at,
    fileTransfer: {
      transferId: payload.transferId,
      files: payload.files
    }
  })
}

const applyPayload = (payload: ChatPayload): void => {
  switch (payload.op) {
    case 'create':
      applyCreate(payload)
      break
    case 'edit':
      applyEdit(payload)
      break
    case 'delete':
      applyDelete(payload)
      break
    case 'file':
      applyFile(payload)
      break
  }
}

const isLegacyChatPayload = (payload: unknown): payload is LegacyChatPayload => {
  if (!payload || typeof payload !== 'object') return false
  const candidate = payload as Record<string, unknown>
  return (
    typeof candidate.text === 'string' &&
    typeof candidate.sender === 'string' &&
    typeof candidate.op === 'undefined'
  )
}

const ingestLegacyPayload = (payload: LegacyChatPayload): void => {
  applyCreate({
    op: 'create',
    id: crypto.randomUUID(),
    text: payload.text.trim(),
    sender: payload.sender.trim() || FALLBACK_SENDER_NAME,
    authorId: crypto.randomUUID(),
    at: Date.now()
  })
}

const refreshLocalSenderName = async (): Promise<string> => {
  if (senderRefreshPromise) {
    return senderRefreshPromise
  }

  senderRefreshPromise = (async () => {
    const userStore = useUserStore()
    const nickname = userStore.currentUser?.nickname?.trim()

    if (userStore.isAuthenticated && nickname) {
      localSenderName.value = nickname
      return nickname
    }

    try {
      const deviceName = (await window.api.settings.getDeviceName()).trim()
      localSenderName.value = deviceName || FALLBACK_SENDER_NAME
      return localSenderName.value
    } catch {
      localSenderName.value = FALLBACK_SENDER_NAME
      return FALLBACK_SENDER_NAME
    }
  })()

  try {
    return await senderRefreshPromise
  } finally {
    senderRefreshPromise = null
  }
}

const initSenderSync = (): void => {
  if (isSenderSyncInitialized) return
  isSenderSyncInitialized = true

  const userStore = useUserStore()

  watch(
    () => userStore.currentUser?.nickname,
    () => {
      void refreshLocalSenderName()
    },
    { immediate: true }
  )
}

const ensureSenderName = async (): Promise<string> => {
  initSenderSync()
  return refreshLocalSenderName()
}

const setTransport = (transport: ChatTransportSender): void => {
  sendTransport = transport
}

const ingestChatPayload = (payload: ChatPayload): void => {
  initSenderSync()

  if (payload && typeof payload === 'object' && 'op' in payload) {
    applyPayload(payload)
    return
  }

  if (isLegacyChatPayload(payload)) {
    ingestLegacyPayload(payload)
    return
  }
}

const clearMessages = (): void => {
  messages.value = []
  lastReadAt.value = Date.now()
}

const isOwnMessage = (message: ChatMessage): boolean => {
  return message.authorId === localAuthorId.value
}

const sendFilesWithPaths = async (paths: string[]): Promise<void> => {
  if (!paths.length) return
  initSenderSync()

  let sender = localSenderName.value || FALLBACK_SENDER_NAME
  try {
    sender = await Promise.race([
      ensureSenderName(),
      new Promise<string>((resolve) => {
        setTimeout(() => resolve(sender), 800)
      })
    ])
  } catch {
    sender = localSenderName.value || FALLBACK_SENDER_NAME
  }

  const meta = await requestOutgoingFileTransferFromPaths(paths, {
    source: 'chat',
    useClipboardPolicy: false
  })
  if (!meta) return

  const payload: ChatFilePayload = {
    op: 'file',
    id: crypto.randomUUID(),
    transferId: meta.transferId,
    files: meta.files,
    sender,
    authorId: localAuthorId.value,
    at: Date.now()
  }

  applyFile(payload)
  sendTransport(payload)
}

const sendMessage = async (text: string): Promise<void> => {
  const normalizedText = text.trim()
  if (!normalizedText) return

  let sender = localSenderName.value || FALLBACK_SENDER_NAME
  try {
    sender = await Promise.race([
      ensureSenderName(),
      new Promise<string>((resolve) => {
        setTimeout(() => resolve(sender), 800)
      })
    ])
  } catch {
    sender = localSenderName.value || FALLBACK_SENDER_NAME
  }

  const payload: ChatCreatePayload = {
    op: 'create',
    id: crypto.randomUUID(),
    text: normalizedText,
    sender,
    authorId: localAuthorId.value,
    at: Date.now()
  }

  applyCreate(payload)
  sendTransport(payload)
}

const editMessage = async (id: string, text: string): Promise<boolean> => {
  const normalizedText = text.trim()
  if (!normalizedText) return false

  await ensureSenderName()
  const targetMessage = messages.value.find((message) => message.id === id)
  if (!targetMessage || !isOwnMessage(targetMessage) || targetMessage.fileTransfer) {
    return false
  }

  const payload: ChatEditPayload = {
    op: 'edit',
    id,
    text: normalizedText,
    at: Date.now()
  }

  applyEdit(payload)
  sendTransport(payload)
  return true
}

const deleteMessage = async (id: string): Promise<boolean> => {
  await ensureSenderName()
  const targetMessage = messages.value.find((message) => message.id === id)
  if (!targetMessage || !isOwnMessage(targetMessage)) {
    return false
  }

  const payload: ChatDeletePayload = {
    op: 'delete',
    id,
    at: Date.now()
  }

  applyDelete(payload)
  sendTransport(payload)
  return true
}

export const chatService = {
  messages,
  localSenderName,
  localAuthorId,
  hasUnread,
  setTransport,
  ingestChatPayload,
  refreshLocalSenderName,
  clearMessages,
  markConversationRead,
  isOwnMessage,
  sendMessage,
  sendFilesWithPaths,
  editMessage,
  deleteMessage
}
