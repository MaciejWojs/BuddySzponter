import { webRtcService } from '@renderer/composables/connection/webRTCService'
import type { P2PMessage } from '@renderer/schemas/p2pProtocol'
import { messageRouter } from '@renderer/composables/webrtc/MessageRouter'
import { chatService, type ChatPayload } from '@renderer/services/chatService'

export interface ChatChannelApi {
  sendChatPayload: (payload: ChatPayload) => void
}

const sendChatPayload = (payload: ChatPayload): void => {
  const encoded = JSON.stringify({ type: 'CHAT', payload })

  if (webRtcService.chatChannel?.readyState === 'open') {
    webRtcService.sendData('chat-channel', encoded)
    return
  }

  // Main guest window doesn't own the RTC connection.
  // Forward outgoing chat payload to guest-view window via BroadcastChannel.
  if (!window.location.hash.toLowerCase().includes('guest')) {
    try {
      const bc = new BroadcastChannel('guest-sync-channel')
      bc.postMessage({ type: 'RELAY_CHAT_OUTGOING', payload })
      bc.close()
    } catch {
      // BroadcastChannel may not be available in every context
    }
  }
}

chatService.setTransport(sendChatPayload)

messageRouter.subscribe('chat-channel', (msg: P2PMessage) => {
  if (msg.type !== 'CHAT') return

  chatService.ingestChatPayload(msg.payload)

  // Guest window has the real P2P connection but no ChatPanel UI.
  // Relay the incoming message to the main window via BroadcastChannel.
  if (window.location.hash.toLowerCase().includes('guest')) {
    try {
      const bc = new BroadcastChannel('guest-sync-channel')
      bc.postMessage({ type: 'RELAY_CHAT', payload: msg.payload })
      bc.close()
    } catch {
      // BroadcastChannel may not be available in every context
    }
  }
})

export function useChatChannel(): ChatChannelApi {
  return { sendChatPayload }
}
