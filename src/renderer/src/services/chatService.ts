import { ref, watch } from 'vue'
import type { P2PMessage } from '@renderer/schemas/p2pProtocol'
import { useUserStore } from '@renderer/stores/userStore'

export type ChatPayload = Extract<P2PMessage, { type: 'CHAT' }>['payload']
type ChatCreatePayload = Extract<ChatPayload, { op: 'create' }>
type ChatEditPayload = Extract<ChatPayload, { op: 'edit' }>
type ChatDeletePayload = Extract<ChatPayload, { op: 'delete' }>

export interface ChatMessage {
  id: string
  text: string
  sender: string
  authorId: string
  createdAt: number
  updatedAt?: number
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
}

const isOwnMessage = (message: ChatMessage): boolean => {
  return message.authorId === localAuthorId.value
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
  if (!targetMessage || !isOwnMessage(targetMessage)) {
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
  setTransport,
  ingestChatPayload,
  refreshLocalSenderName,
  clearMessages,
  isOwnMessage,
  sendMessage,
  editMessage,
  deleteMessage
}
