import { BaseDataChannel } from './BaseDataChannel'
import {
  ChatSchema,
  type ChatMessage,
  type ChatPayload
} from '@renderer/composables/webrtc/datachannel/schemas/channelSchemas'
import { chatService } from '@renderer/services/chatService'
import {
  relayIncomingChatToMainWindow,
  relayOutgoingChatFromMainWindow
} from '@renderer/utils/guestSyncRelay'

export type ChatOutMessage = ChatMessage

export class ChatDataChannel extends BaseDataChannel<ChatOutMessage, ChatMessage> {
  protected readonly label = 'chat-channel'
  protected readonly inSchema = ChatSchema

  protected handleMessage(msg: ChatMessage): void {
    chatService.ingestChatPayload(msg.payload)
    relayIncomingChatToMainWindow(msg.payload)
  }

  public sendChatPayload(payload: ChatPayload): boolean {
    if (this.readyState === 'open') {
      return this.send({ type: 'CHAT', payload })
    }

    relayOutgoingChatFromMainWindow(payload)
    return false
  }
}
