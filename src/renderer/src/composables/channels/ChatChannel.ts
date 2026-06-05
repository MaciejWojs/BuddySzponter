import { dataChannelManager } from '@renderer/composables/webrtc/datachannel/DataChannelManager'
import type { ChatPayload } from '@renderer/composables/webrtc/datachannel/schemas/channelSchemas'
import { chatService } from '@renderer/services/chatService'
import { relayOutgoingChatFromMainWindow } from '@renderer/utils/guestSyncRelay'

export interface ChatChannelApi {
  sendChatPayload: (payload: ChatPayload) => void
}

const sendChatPayload = (payload: ChatPayload): void => {
  const chatChannel = dataChannelManager.getChat()
  if (chatChannel?.sendChatPayload(payload)) {
    return
  }

  relayOutgoingChatFromMainWindow(payload)
}

chatService.setTransport(sendChatPayload)

export function useChatChannel(): ChatChannelApi {
  return { sendChatPayload }
}
