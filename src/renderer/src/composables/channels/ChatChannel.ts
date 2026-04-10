import { ref, Ref } from 'vue'
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { P2PMessage } from '@renderer/schemas/p2pProtocol'

export type ChatPayload = Extract<P2PMessage, { type: 'CHAT' }>['payload']

export interface ChatChannelApi {
  chatMessages: Ref<string[]>
  handleIncomingMessage: (payload: ChatPayload) => void
  sendChatMessage: (text: string, sender?: string) => void
}

export function ChatChannel(): ChatChannelApi {
  const chatMessages = ref<string[]>([])

  const handleIncomingMessage = (payload: ChatPayload): void => {
    chatMessages.value.push(`${payload.sender}: ${payload.text}`)
  }

  const sendChatMessage = (text: string, sender = 'Ja'): void => {
    const normalized = text.trim()
    if (!normalized) return

    chatMessages.value.push(`Ja: ${normalized}`)
    webRtcService.sendData(
      'chat-channel',
      JSON.stringify({ type: 'CHAT', payload: { text: normalized, sender } })
    )
  }

  return { chatMessages, handleIncomingMessage, sendChatMessage }
}
