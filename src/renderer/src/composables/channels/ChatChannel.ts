import { ref, Ref } from 'vue'
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { P2PMessage } from '@renderer/schemas/p2pProtocol'
import { messageRouter } from '@renderer/composables/webrtc/MessageRouter'

export type ChatPayload = Extract<P2PMessage, { type: 'CHAT' }>['payload']

export interface ChatChannelApi {
  chatMessages: Ref<string[]>
  sendChatMessage: (text: string, sender?: string) => void
}

const chatMessages = ref<string[]>([])

messageRouter.subscribe('chat-channel', (msg: P2PMessage) => {
  if (msg.type === 'CHAT') {
    chatMessages.value.push(`${msg.payload.sender}: ${msg.payload.text}`)
  }
})

export function useChatChannel(): ChatChannelApi {
  const sendChatMessage = (text: string, sender = 'Ja'): void => {
    const normalized = text.trim()
    if (!normalized) return

    chatMessages.value.push(`Ja: ${normalized}`)
    webRtcService.sendData(
      'chat-channel',
      JSON.stringify({ type: 'CHAT', payload: { text: normalized, sender } })
    )
  }

  return { chatMessages, sendChatMessage }
}
