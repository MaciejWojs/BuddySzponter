import { dataChannelManager } from '@renderer/composables/webrtc/datachannel/DataChannelManager'
import type { ChatPayload } from '@renderer/composables/webrtc/datachannel/schemas/channelSchemas'
import { chatService } from '@renderer/services/chatService'

export interface ChatChannelApi {
  sendChatPayload: (payload: ChatPayload) => void
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
