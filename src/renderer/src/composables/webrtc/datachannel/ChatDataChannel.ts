import { BaseDataChannel } from './BaseDataChannel'
import {
  ChatSchema,
  type ChatMessage,
  type ChatPayload
} from '@renderer/composables/webrtc/datachannel/schemas/channelSchemas'
import { chatService } from '@renderer/services/chatService'

export type ChatOutMessage = ChatMessage

function relayChatToMainWindow(payload: ChatPayload): void {
  if (!window.location.hash.toLowerCase().includes('guest')) return

  try {
    const bc = new BroadcastChannel('guest-sync-channel')
    bc.postMessage({ type: 'RELAY_CHAT', payload })
    bc.close()
  } catch {
    // BroadcastChannel may not be available in every context
  }
}

function relayOutgoingChatFromMainWindow(payload: ChatPayload): void {
  if (window.location.hash.toLowerCase().includes('guest')) return

  try {
    const bc = new BroadcastChannel('guest-sync-channel')
    bc.postMessage({ type: 'RELAY_CHAT_OUTGOING', payload })
    bc.close()
  } catch {
    // BroadcastChannel may not be available in every context
  }
}

export class ChatDataChannel extends BaseDataChannel<ChatOutMessage, ChatMessage> {
  protected readonly label = 'chat-channel'
  protected readonly inSchema = ChatSchema

  protected handleMessage(msg: ChatMessage): void {
    chatService.ingestChatPayload(msg.payload)
    relayChatToMainWindow(msg.payload)
  }

  public sendChatPayload(payload: ChatPayload): boolean {
    if (this.readyState === 'open') {
      return this.send({ type: 'CHAT', payload })
    }

    relayOutgoingChatFromMainWindow(payload)
    return false
  }
}
